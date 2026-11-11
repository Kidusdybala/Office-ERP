import { DurableObject } from 'cloudflare:workers';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  LIVE: DurableObjectNamespace<LiveUpdates>;
  APP_TIMEZONE?: string;
  APP_ORIGIN?: string;
  HIKVISION_WEBHOOK_TOKEN?: string;
}

type User = {
  id: number;
  employee_id: string | null;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  department_id: number | null;
  department_name?: string | null;
  manager_id: number | null;
};

type Session = { user: User; tokenHash: string };
const TZ = 'Africa/Nairobi';
const COOKIE_SESSION = 'erp_session';
const COOKIE_CSRF = 'erp_csrf';

const json = (data: unknown, status = 200, headers: HeadersInit = {}) => {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('content-type', 'application/json; charset=utf-8');
  responseHeaders.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
};

const fail = (message: string, status = 400) => json({ message }, status);
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

async function bodyJson(request: Request): Promise<Record<string, unknown>> {
  const value: unknown = await request.json().catch(() => null);
  if (!isObject(value)) throw new Error('Send a valid JSON request.');
  return value;
}

function cookieValue(request: Request, key: string): string | null {
  const cookies = request.headers.get('cookie') ?? '';
  for (const item of cookies.split(';')) {
    const [name, ...value] = item.trim().split('=');
    if (name === key) return decodeURIComponent(value.join('='));
  }
  return null;
}

function cookie(key: string, value: string, secure: boolean, maxAge: number): string {
  const httpOnly = key === COOKIE_SESSION ? '; HttpOnly' : '';
  return `${key}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=${maxAge}${httpOnly}${secure ? '; Secure' : ''}`;
}

function setAuthCookies(request: Request, session: string, csrf: string): Headers {
  const headers = new Headers();
  const secure = new URL(request.url).protocol === 'https:';
  headers.append('set-cookie', cookie(COOKIE_SESSION, session, secure, 60 * 60 * 24 * 14));
  headers.append('set-cookie', cookie(COOKIE_CSRF, csrf, secure, 60 * 60 * 24 * 14));
  return headers;
}

function clearAuthCookies(request: Request): Headers {
  const headers = new Headers();
  const secure = new URL(request.url).protocol === 'https:';
  headers.append('set-cookie', cookie(COOKIE_SESSION, '', secure, 0));
  headers.append('set-cookie', cookie(COOKIE_CSRF, '', secure, 0));
  return headers;
}

function dateParts(date = new Date()): { year: number; month: number; day: number; date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year), month: Number(values.month), day: Number(values.day),
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}:${values.second}`,
  };
}

function dateOnly(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value ? null : value;
}

function weekStart(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  const mondayOffset = (day + 6) % 7;
  const start = new Date(`${date}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - mondayOffset);
  return start.toISOString().slice(0, 10);
}

function addDays(date: string, count: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + count);
  return next.toISOString().slice(0, 10);
}

function weekdays(from: string, to: string): number {
  let count = 0;
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const day = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

async function digest(value: string): Promise<string> {
  const data = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(data))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function randomToken(bytes = 32): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...data)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const iterations = 100_000;
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return `pbkdf2$${iterations}$${btoa(String.fromCharCode(...salt))}$${btoa(String.fromCharCode(...new Uint8Array(bits)))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, iterationsText, saltText, expected] = stored.split('$');
  const iterations = Number(iterationsText);
  if (algorithm !== 'pbkdf2' || !Number.isInteger(iterations) || iterations < 100_000 || !saltText || !expected) return false;
  const salt = Uint8Array.from(atob(saltText), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  const actual = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return actual.length === expected.length && [...actual].reduce((different, char, i) => different | (char.charCodeAt(0) ^ expected.charCodeAt(i)), 0) === 0;
}

async function loadSession(request: Request, env: Env): Promise<Session | null> {
  const raw = cookieValue(request, COOKIE_SESSION);
  if (!raw) return null;
  const tokenHash = await digest(raw);
  const row = await env.DB.prepare(`
    SELECT u.id, u.employee_id, u.name, u.email, u.role, u.department_id, u.manager_id,
           d.name AS department_name, s.token_hash
    FROM sessions s JOIN users u ON u.id = s.user_id
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).bind(tokenHash, new Date().toISOString()).first<User & { token_hash: string }>();
  return row ? { user: row, tokenHash: row.token_hash } : null;
}

function sameOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const allowedOrigins = [new URL(request.url).origin, ...(env.APP_ORIGIN ?? '').split(',').map((item) => item.trim()).filter(Boolean)];
  return allowedOrigins.includes(origin);
}

function validCsrf(request: Request): boolean {
  const cookieToken = cookieValue(request, COOKIE_CSRF);
  const headerToken = request.headers.get('x-csrf-token');
  return !!cookieToken && !!headerToken && cookieToken === headerToken;
}

function userJson(user: User) {
  return {
    id: user.id, employee_id: user.employee_id, name: user.name, email: user.email,
    role: user.role, department: user.department_name ?? null, department_id: user.department_id,
  };
}

function visibleTeam(user: User): string {
  return user.role === 'manager' || user.role === 'admin'
    ? '(user_id = ? OR user_id IN (SELECT id FROM users WHERE manager_id = ?))'
    : 'user_id = ?';
}

function teamBindings(user: User): number[] {
  return user.role === 'manager' || user.role === 'admin' ? [user.id, user.id] : [user.id];
}

async function broadcast(env: Env, type: string): Promise<void> {
  try {
    const live = env.LIVE.get(env.LIVE.idFromName('workforce-live-updates'));
    await live.fetch('https://live/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, at: new Date().toISOString() }),
    });
  } catch (error) {
    console.error('Live update broadcast failed.', error);
  }
}

async function dashboard(user: User, env: Env): Promise<Response> {
  const today = dateParts().date;
  const monthStart = `${today.slice(0, 7)}-01`;
  const monday = weekStart(today);
  const friday = addDays(monday, 4);
  const scope = visibleTeam(user);
  const bindings = teamBindings(user);

  const [monthAttendance, weekAttendance, monthReports, todayAttendance, recent, plans, reports, weeklyPlan, weeklyReport] = await Promise.all([
    env.DB.prepare(`SELECT * FROM attendances WHERE ${scope} AND date BETWEEN ? AND ? ORDER BY date`).bind(...bindings, monthStart, today).all(),
    env.DB.prepare(`SELECT * FROM attendances WHERE ${scope} AND date BETWEEN ? AND ? ORDER BY date`).bind(...bindings, monday, friday).all(),
    env.DB.prepare(`SELECT AVG(percentage) AS average FROM reports WHERE ${scope} AND report_date BETWEEN ? AND ?`).bind(...bindings, monthStart, today).first<{ average: number | null }>(),
    env.DB.prepare(`SELECT * FROM attendances WHERE user_id = ? AND date = ?`).bind(user.id, today).first(),
    env.DB.prepare(`SELECT * FROM attendances WHERE ${scope} ORDER BY date DESC LIMIT 7`).bind(...bindings).all(),
    env.DB.prepare(`SELECT * FROM plans WHERE ${scope} AND plan_date = ? ORDER BY id DESC LIMIT 1`).bind(...bindings, today).first(),
    env.DB.prepare(`SELECT * FROM reports WHERE ${scope} AND report_date = ? ORDER BY id DESC LIMIT 1`).bind(...bindings, today).first(),
    env.DB.prepare(`SELECT * FROM plans WHERE ${scope} AND plan_date BETWEEN ? AND ? AND (plan_date = ? OR lower(title) LIKE '%weekly%') ORDER BY plan_date DESC, id DESC LIMIT 1`).bind(...bindings, monday, friday, monday).first(),
    env.DB.prepare(`SELECT * FROM reports WHERE ${scope} AND report_date BETWEEN ? AND ? AND (report_date = ? OR lower(description) LIKE '%weekly%') ORDER BY report_date DESC, id DESC LIMIT 1`).bind(...bindings, monday, friday, friday).first(),
  ]);

  const monthRows = monthAttendance.results as Array<{ date: string; status: string; punch_in: string | null; punch_out: string | null; total_hours: number | null }>;
  const weekRows = weekAttendance.results as typeof monthRows;
  const present = monthRows.filter((row) => ['present', 'late', 'half_day'].includes(row.status) && row.punch_in && (row.punch_out || row.date === today)).length;
  const attendedWeek = weekRows.filter((row) => !!row.punch_in).length;
  const hoursMonth = monthRows.reduce((total, row) => total + Number(row.total_hours ?? 0), 0);
  const hoursWeek = weekRows.reduce((total, row) => total + Number(row.total_hours ?? 0), 0);
  const workingMonth = weekdays(monthStart, today);
  const todayRow = todayAttendance as Record<string, unknown> | null;
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = addDays(monday, index);
    const row = weekRows.find((item) => item.date === date);
    const dayName = new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: TZ }).format(new Date(`${date}T12:00:00Z`));
    return { date, dayName, hours: Number(row?.total_hours ?? 0), status: row?.status ?? (date < today ? 'absent' : 'pending'), isToday: date === today };
  });

  return json({
    today, user: userJson(user),
    attendance: {
      today: todayRow,
      rate: workingMonth ? Math.round(Math.min(present / workingMonth, 1) * 100) : 0,
      weekRate: weekdays(monday, today < friday ? today : friday) ? Math.round(attendedWeek / weekdays(monday, today < friday ? today : friday) * 100) : 0,
      onTime: monthRows.filter((row) => row.punch_in).length
        ? Math.round(monthRows.filter((row) => row.punch_in && new Date(row.punch_in).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }) <= '09:00').length / monthRows.filter((row) => row.punch_in).length * 100)
        : 0,
      hoursMonth: Math.round(hoursMonth * 10) / 10,
      hoursWeek: Math.round(hoursWeek * 10) / 10,
      recent: recent.results,
    },
    plans: { completion: Math.round(Number(monthReports?.average ?? 0)), today: plans, weekly: weeklyPlan },
    reports: { today: reports, weekly: weeklyReport }, days,
  });
}

async function listPlans(user: User, env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const range = url.searchParams.get('week') ?? 'this_week';
  const today = dateParts().date;
  const monday = weekStart(today);
  let dateClause = '';
  const params: (string | number)[] = [];
  if (range === 'this_week') { dateClause = 'AND p.plan_date BETWEEN ? AND ?'; params.push(monday, addDays(monday, 6)); }
  else if (range === 'last_week') { const last = addDays(monday, -7); dateClause = 'AND p.plan_date BETWEEN ? AND ?'; params.push(last, addDays(last, 6)); }
  const scope = user.role === 'manager' || user.role === 'admin'
    ? '(p.user_id = ? OR u.manager_id = ?)' : 'p.user_id = ?';
  const items = await env.DB.prepare(`
    SELECT p.*, u.name AS employee_name,
      (SELECT r.percentage FROM reports r WHERE r.plan_id = p.id ORDER BY r.report_date DESC, r.id DESC LIMIT 1) AS report_percentage
    FROM plans p JOIN users u ON u.id = p.user_id
    WHERE ${scope} ${dateClause} ORDER BY p.plan_date DESC, p.id DESC LIMIT 100
  `).bind(...teamBindings(user), ...params).all();
  return json({ plans: items.results, week: range });
}

async function listReports(user: User, env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const sort = ['percentage_desc', 'percentage_asc', 'date_desc', 'date_asc', 'employee'].includes(url.searchParams.get('sort') ?? '')
    ? url.searchParams.get('sort')! : 'percentage_desc';
  const orderBy: Record<string, string> = {
    percentage_desc: 'r.percentage DESC', percentage_asc: 'r.percentage ASC',
    date_desc: 'r.report_date DESC', date_asc: 'r.report_date ASC', employee: 'u.name ASC',
  };
  const scope = user.role === 'manager' || user.role === 'admin' ? "u.role = 'employee'" : 'r.user_id = ?';
  const query = env.DB.prepare(`
    SELECT r.*, u.name AS employee_name, p.title AS plan_title
    FROM reports r JOIN users u ON u.id = r.user_id LEFT JOIN plans p ON p.id = r.plan_id
    WHERE ${scope} ORDER BY ${orderBy[sort]} LIMIT 100
  `);
  const items = (user.role === 'manager' || user.role === 'admin') ? await query.all() : await query.bind(user.id).all();
  return json({ reports: items.results, sort });
}

async function punch(user: User, env: Env, direction: 'in' | 'out'): Promise<Response> {
  if (user.role === 'manager' || user.role === 'admin') return fail('Managers cannot punch in or out.', 403);
  const now = new Date();
  const { date } = dateParts(now);
  const instant = now.toISOString();
  const existing = await env.DB.prepare('SELECT punch_in, punch_out FROM attendances WHERE user_id = ? AND date = ?')
    .bind(user.id, date).first<{ punch_in: string | null; punch_out: string | null }>();
  if (direction === 'in') {
    const punchIn = existing?.punch_in && existing.punch_in < instant ? existing.punch_in : instant;
    const punchOut = existing?.punch_out ?? null;
    const hours = punchOut ? Math.max(0, Math.round((new Date(punchOut).getTime() - new Date(punchIn).getTime()) / 36000) / 100) : null;
    const punchInTime = dateParts(new Date(punchIn)).time;
    const status = hours !== null && hours < 4 ? 'half_day' : punchInTime.slice(0, 5) > '09:00' ? 'late' : 'present';
    await env.DB.prepare(`INSERT INTO attendances (user_id, date, punch_in, punch_out, total_hours, status) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET punch_in = MIN(attendances.punch_in, excluded.punch_in),
        punch_out = excluded.punch_out, total_hours = excluded.total_hours, status = excluded.status, updated_at = CURRENT_TIMESTAMP`)
      .bind(user.id, date, punchIn, punchOut, hours, status).run();
    await broadcast(env, 'attendance.updated');
    return json({ message: `Earliest punch-in is ${dateParts(new Date(punchIn)).time.slice(0, 5)}.`, attendance: { date, punch_in: punchIn, punch_out: punchOut, total_hours: hours, status } });
  }
  if (!existing?.punch_in) return fail('You need to punch in before punching out.', 409);
  const punchOut = existing.punch_out && existing.punch_out > instant ? existing.punch_out : instant;
  const hours = Math.max(0, Math.round((new Date(punchOut).getTime() - new Date(existing.punch_in).getTime()) / 36000) / 100);
  const punchInTime = dateParts(new Date(existing.punch_in)).time;
  const status = hours < 4 ? 'half_day' : punchInTime.slice(0, 5) > '09:00' ? 'late' : 'present';
  await env.DB.prepare('UPDATE attendances SET punch_out = ?, total_hours = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND date = ?')
    .bind(punchOut, hours, status, user.id, date).run();
  await broadcast(env, 'attendance.updated');
  return json({ message: `Latest punch-out is ${dateParts(new Date(punchOut)).time.slice(0, 5)} — ${hours} hrs logged.`, attendance: { date, punch_in: existing.punch_in, punch_out: punchOut, total_hours: hours, status } });
}

function xmlValue(xml: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return xml.match(new RegExp(`<(?:(?:[\\w.-]+):)?${escaped}[^>]*>([^<]*)<\\/`, 'i'))?.[1]?.trim() ?? null;
}

async function hikvision(request: Request, env: Env): Promise<Response> {
  const token = env.HIKVISION_WEBHOOK_TOKEN;
  const provided = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token || !provided || token.length !== provided.length || [...token].reduce((n, c, i) => n | (c.charCodeAt(0) ^ provided.charCodeAt(i)), 0) !== 0) {
    return fail('Unauthorized', 401);
  }
  const content = await request.text();
  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(content) as Record<string, unknown>; } catch { /* XML event below */ }
  const xml = content.trim();
  const event = isObject(payload.AccessControllerEvent) ? payload.AccessControllerEvent : {
    majorEventType: xmlValue(xml, 'majorEventType'), subEventType: xmlValue(xml, 'subEventType'),
    employeeNoString: xmlValue(xml, 'employeeNoString'), currentVerifyMode: xmlValue(xml, 'currentVerifyMode'),
    currentEvent: xmlValue(xml, 'currentEvent'), time: xmlValue(xml, 'time'),
  };
  const eventType = payload.eventType ?? xmlValue(xml, 'eventType');
  const eventState = String(payload.eventState ?? xmlValue(xml, 'eventState') ?? 'active').toLowerCase();
  const mode = String(event.currentVerifyMode ?? '').toLowerCase();
  if (eventType !== 'AccessControllerEvent' || eventState !== 'active' || String(event.currentEvent ?? 'true').toLowerCase() === 'false'
      || Number(event.majorEventType) !== 5 || Number(event.subEventType) !== 75 || !mode.includes('face') || mode.includes('or')) {
    return json({ message: 'Event ignored.' });
  }
  const employeeId = String(event.employeeNoString ?? '').trim();
  if (!employeeId) return json({ message: 'Employee number missing.' });
  const user = await env.DB.prepare('SELECT id FROM users WHERE employee_id = ?').bind(employeeId).first<{ id: number }>();
  if (!user) return fail('Employee not found.', 404);
  let occurred = String(payload.dateTime ?? event.time ?? '');
  if (occurred && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(occurred)) occurred += '+03:00';
  const parsed = occurred ? new Date(occurred) : new Date();
  if (Number.isNaN(parsed.valueOf())) return fail('Invalid event time.');
  const local = dateParts(parsed);
  const time = local.time;
  const status = time.slice(0, 5) > '09:00' ? 'late' : 'present';
  const instant = parsed.toISOString();
  const saved = await env.DB.prepare(`INSERT INTO attendances (user_id, date, punch_in, status)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        punch_out = CASE
          WHEN MAX(COALESCE(attendances.punch_out, attendances.punch_in), excluded.punch_in) > MIN(attendances.punch_in, excluded.punch_in)
          THEN MAX(COALESCE(attendances.punch_out, attendances.punch_in), excluded.punch_in)
          ELSE NULL
        END,
        total_hours = CASE
          WHEN MAX(COALESCE(attendances.punch_out, attendances.punch_in), excluded.punch_in) > MIN(attendances.punch_in, excluded.punch_in)
          THEN ROUND((julianday(MAX(COALESCE(attendances.punch_out, attendances.punch_in), excluded.punch_in)) - julianday(MIN(attendances.punch_in, excluded.punch_in))) * 24, 2)
          ELSE NULL
        END,
        status = CASE WHEN excluded.punch_in < attendances.punch_in THEN excluded.status ELSE attendances.status END,
        punch_in = MIN(attendances.punch_in, excluded.punch_in),
        updated_at = CURRENT_TIMESTAMP`)
    .bind(user.id, local.date, instant, status).run();
  if (saved.meta.changes) await broadcast(env, 'attendance.updated');
  return json({ message: 'Attendance event recorded.' });
}

async function api(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  const method = request.method.toUpperCase();
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  if (mutation && !sameOrigin(request, env)) return fail('Cross-origin request blocked.', 403);
  if (pathname === '/api/health' && method === 'GET') return json({ status: 'ok', timezone: TZ, runtime: 'cloudflare-workers' });
  if (pathname === '/hikvision/events' && method === 'POST') return hikvision(request, env);

  if ((pathname === '/api/auth/login' || pathname === '/api/auth/register') && method === 'POST') {
    let input: Record<string, unknown>;
    try { input = await bodyJson(request); } catch (error) { return fail(error instanceof Error ? error.message : 'Invalid request.'); }
    const name = String(input.name ?? '').trim();
    const email = String(input.email ?? '').trim().toLowerCase();
    const password = String(input.password ?? '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 200) return fail('Enter a valid email and a password with at least 8 characters.');
    let userId: number;
    if (pathname.endsWith('register')) {
      if (name.length < 2 || name.length > 100) return fail('Enter your name.');
      const passwordHash = await hashPassword(password);
      const created = await env.DB.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, \'employee\')')
        .bind(name, email, passwordHash).run().catch(() => null);
      if (!created?.meta.last_row_id) return fail('An account with that email may already exist.', 409);
      userId = Number(created.meta.last_row_id);
    } else {
      const found = await env.DB.prepare('SELECT id, password_hash FROM users WHERE email = ? COLLATE NOCASE').bind(email)
        .first<{ id: number; password_hash: string }>();
      if (!found || !await verifyPassword(password, found.password_hash)) return fail('Email or password is incorrect.', 401);
      userId = found.id;
    }
    const rawSession = randomToken();
    const csrf = randomToken(24);
    const tokenHash = await digest(rawSession);
    const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(tokenHash, userId, expires).run();
    const user = await env.DB.prepare('SELECT u.id, u.employee_id, u.name, u.email, u.role, u.department_id, u.manager_id, d.name AS department_name FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE u.id = ?')
      .bind(userId).first<User>();
    if (!user) return fail('Account was created but could not be loaded.', 500);
    return json({ user: userJson(user) }, 200, setAuthCookies(request, rawSession, csrf));
  }

  const session = await loadSession(request, env);
  if (pathname === '/api/auth/me' && method === 'GET') return session ? json({ user: userJson(session.user) }) : fail('Unauthenticated.', 401);
  if (pathname === '/api/auth/logout' && method === 'POST') {
    if (session && !validCsrf(request)) return fail('Session token is invalid.', 403);
    if (session) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(session.tokenHash).run();
    return json({ message: 'Logged out.' }, 200, clearAuthCookies(request));
  }
  if (!session) return fail('Unauthenticated.', 401);
  if (pathname === '/api/live' && method === 'GET') {
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return fail('WebSocket upgrade required.', 426);
    const live = env.LIVE.get(env.LIVE.idFromName('workforce-live-updates'));
    const headers = new Headers(request.headers);
    headers.set('x-erp-user-id', String(session.user.id));
    headers.set('x-erp-user-role', session.user.role);
    return live.fetch(new Request('https://live/connect', { method: 'GET', headers }));
  }
  if (mutation && !validCsrf(request)) return fail('Session token is invalid. Refresh the page and try again.', 403);
  const user = session.user;

  if (pathname === '/api/dashboard' && method === 'GET') return dashboard(user, env);
  if (pathname === '/api/plans' && method === 'GET') return listPlans(user, env, request);
  if (pathname === '/api/plans' && method === 'POST') {
    let input: Record<string, unknown>;
    try { input = await bodyJson(request); } catch (error) { return fail(error instanceof Error ? error.message : 'Invalid request.'); }
    const title = String(input.title ?? '').trim();
    const planDate = dateOnly(input.plan_date);
    if (!title || title.length > 255 || !planDate) return fail('Enter a title and valid plan date.');
    const result = await env.DB.prepare('INSERT INTO plans (user_id, title, description, plan_date) VALUES (?, ?, ?, ?)')
      .bind(user.id, title, String(input.description ?? '').trim() || null, planDate).run();
    await broadcast(env, 'plans.updated');
    return json({ message: 'Plan created.', id: result.meta.last_row_id }, 201);
  }
  const planStatus = pathname.match(/^\/api\/plans\/(\d+)\/status$/);
  if (planStatus && method === 'PATCH') {
    let input: Record<string, unknown>;
    try { input = await bodyJson(request); } catch (error) { return fail(error instanceof Error ? error.message : 'Invalid request.'); }
    const status = String(input.status ?? '');
    if (!['pending', 'in_progress', 'completed', 'missed'].includes(status)) return fail('Invalid plan status.');
    const existing = await env.DB.prepare('SELECT user_id FROM plans WHERE id = ?').bind(Number(planStatus[1])).first<{ user_id: number }>();
    if (!existing) return fail('Plan not found.', 404);
    if (existing.user_id !== user.id && user.role !== 'manager' && user.role !== 'admin') return fail('Forbidden.', 403);
    await env.DB.prepare('UPDATE plans SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, Number(planStatus[1])).run();
    await broadcast(env, 'plans.updated');
    return json({ message: 'Plan status updated.' });
  }
  if (pathname === '/api/reports' && method === 'GET') return listReports(user, env, request);
  if (pathname === '/api/reports' && method === 'POST') {
    if (user.role === 'manager' || user.role === 'admin') return fail('Managers cannot submit employee reports.', 403);
    let input: Record<string, unknown>;
    try { input = await bodyJson(request); } catch (error) { return fail(error instanceof Error ? error.message : 'Invalid request.'); }
    const reportDate = dateOnly(input.report_date);
    const description = String(input.description ?? '').trim();
    const percentage = Number(input.percentage);
    const status = String(input.status ?? 'on_track');
    const startTime = String(input.start_time ?? '').trim() || null;
    const endTime = String(input.end_time ?? '').trim() || null;
    const planId = input.plan_id ? Number(input.plan_id) : null;
    if (!reportDate || !description || description.length > 10000 || !Number.isInteger(percentage) || percentage < 0 || percentage > 100
        || !['on_track', 'delayed', 'completed', 'blocked'].includes(status)
        || (startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime))
        || (endTime && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || (startTime && endTime <= startTime)))) {
      return fail('Check the date, description, progress, status, and times.');
    }
    if (planId) {
      const plan = await env.DB.prepare('SELECT user_id FROM plans WHERE id = ?').bind(planId).first<{ user_id: number }>();
      if (!plan || plan.user_id !== user.id) return fail('The selected plan is not yours.', 403);
    }
    const result = await env.DB.prepare(`INSERT INTO reports (plan_id, user_id, report_date, description, percentage, status, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(planId, user.id, reportDate, description, percentage, status, startTime, endTime).run();
    if (planId) await env.DB.prepare('UPDATE plans SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
      .bind(percentage >= 100 ? 'completed' : 'in_progress', planId, user.id).run();
    await broadcast(env, 'reports.updated');
    return json({ message: 'Report submitted.', id: result.meta.last_row_id }, 201);
  }
  if (pathname === '/api/attendance' && method === 'GET') {
    if (user.role === 'manager' || user.role === 'admin') return json({ attendance: [] });
    const today = dateParts().date;
    const items = await env.DB.prepare('SELECT * FROM attendances WHERE user_id = ? ORDER BY date DESC LIMIT 7').bind(user.id).all();
    const current = await env.DB.prepare('SELECT * FROM attendances WHERE user_id = ? AND date = ?').bind(user.id, today).first();
    return json({ attendance: items.results, today: current, date: today });
  }
  if (pathname === '/api/attendance/punch-in' && method === 'POST') return punch(user, env, 'in');
  if (pathname === '/api/attendance/punch-out' && method === 'POST') return punch(user, env, 'out');
  if (pathname === '/api/profile' && method === 'GET') return json({ user: userJson(user) });
  if (pathname === '/api/profile' && method === 'PATCH') {
    let input: Record<string, unknown>;
    try { input = await bodyJson(request); } catch (error) { return fail(error instanceof Error ? error.message : 'Invalid request.'); }
    const name = String(input.name ?? '').trim();
    const email = String(input.email ?? '').trim().toLowerCase();
    if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Enter a valid name and email.');
    const updated = await env.DB.prepare('UPDATE users SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(name, email, user.id).run().catch(() => null);
    if (!updated?.meta.changes) return fail('That email may already be in use.', 409);
    await broadcast(env, 'profile.updated');
    return json({ message: 'Profile updated.' });
  }
  if (pathname === '/api/profile/password' && method === 'PATCH') {
    let input: Record<string, unknown>;
    try { input = await bodyJson(request); } catch (error) { return fail(error instanceof Error ? error.message : 'Invalid request.'); }
    const currentPassword = String(input.current_password ?? '');
    const password = String(input.password ?? '');
    const confirmation = String(input.password_confirmation ?? '');
    const stored = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first<{ password_hash: string }>();
    if (!stored || !await verifyPassword(currentPassword, stored.password_hash)) return fail('Your current password is incorrect.', 403);
    if (password.length < 8 || password.length > 200 || password !== confirmation) return fail('The new password must be at least 8 characters and match the confirmation.');
    const passwordHash = await hashPassword(password);
    await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(passwordHash, user.id).run();
    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(user.id, session.tokenHash).run();
    return json({ message: 'Password updated.' });
  }
  return fail('API route not found.', 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/') || url.pathname === '/hikvision/events') return await api(request, env);
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error('Worker request failed.', error);
      return fail('The server could not complete the request.', 500);
    }
  },
};

export class LiveUpdates extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/publish' && request.method === 'POST') {
      const message = await request.text();
      for (const socket of this.ctx.getWebSockets()) {
        try { socket.send(message); } catch { socket.close(1011, 'Unable to send update'); }
      }
      return new Response('ok');
    }
    if (url.pathname === '/connect' && request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ userId: request.headers.get('x-erp-user-id'), role: request.headers.get('x-erp-user-role') });
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response('Not found', { status: 404 });
  }

  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): void {
    if (message === 'ping') socket.send('pong');
  }

  webSocketClose(socket: WebSocket, code: number, reason: string): void {
    try { socket.close(code, reason); } catch { /* already closed */ }
  }
}
