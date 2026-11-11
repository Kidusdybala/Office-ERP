import './style.css';

type User = { id: number; employee_id: string | null; name: string; email: string; role: string; department: string | null };
type Data = Record<string, any>;
const app = document.querySelector<HTMLDivElement>('#app')!;
app.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const menu = app.querySelector<HTMLElement>('#account-menu');
  const toggle = target.closest<HTMLButtonElement>('#account-menu-toggle');
  if (toggle && menu) {
    menu.hidden = !menu.hidden;
    toggle.setAttribute('aria-expanded', String(!menu.hidden));
    return;
  }
  if (target.closest('#menu-signout')) {
    if (menu) menu.hidden = true;
    app.querySelector<HTMLDialogElement>('#logout-dialog')?.showModal();
    return;
  }
  if (target.closest('#cancel-signout')) {
    app.querySelector<HTMLDialogElement>('#logout-dialog')?.close();
    return;
  }
  if (target.closest('#confirm-signout')) {
    app.querySelector<HTMLDialogElement>('#logout-dialog')?.close();
    finishSignOut();
    return;
  }
  const dialog = app.querySelector<HTMLDialogElement>('#logout-dialog');
  if (dialog && event.target === dialog) dialog.close();
  if (menu && !target.closest('.account-menu-wrap')) {
    menu.hidden = true;
    app.querySelector('#account-menu-toggle')?.setAttribute('aria-expanded', 'false');
  }
});
let user: User | null = null;
let page = 'dashboard';
let dashboardData: Data | null = null;
let refreshTimer: number | undefined;
let liveSocket: WebSocket | null = null;
let reconnectTimer: number | undefined;
let dashboardRefreshInFlight = false;

async function finishSignOut(): Promise<void> {
  try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); } catch { /* still clear the local view */ }
  liveSocket?.close();
  liveSocket = null;
  window.clearTimeout(reconnectTimer);
  user = null;
  dashboardData = null;
  location.hash = '#login';
  authView();
}

function csrfToken(): string {
  return document.cookie.split('; ').find((item) => item.startsWith('erp_csrf='))?.slice('erp_csrf='.length) ?? '';
}

async function api<T = Data>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('content-type', 'application/json');
  const method = (options.method ?? 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('x-csrf-token', decodeURIComponent(csrfToken()));
  const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
  const result: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message ?? `Request failed (${response.status}).`);
  return result as T;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function fmtDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }): string {
  if (!value) return '—';
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00+03:00` : value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'Africa/Nairobi' }).format(parsed);
}

function fmtTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' }).format(new Date(value));
}

function todayIso(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((item) => [item.type, item.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function toast(message: string, kind = 'success'): void {
  const node = document.createElement('div');
  node.className = `toast ${kind}`;
  node.textContent = message;
  document.body.append(node);
  window.setTimeout(() => node.remove(), 3200);
}

function badge(value: string): string {
  const label = value.replaceAll('_', ' ');
  return `<span class="badge ${escapeHtml(value)}">${escapeHtml(label)}</span>`;
}

function authView(register = false): void {
  clearInterval(refreshTimer);
  app.innerHTML = `
    <main class="auth-shell">
      <section class="auth-card">
        <div class="brand-lockup"><img src="/images/logo-circle.png" alt="IRack IT Solution"><div><b>IRack IT Solution</b><small>WORKFORCE ERP</small></div></div>
        <div class="auth-intro"><span class="eyebrow">TEAM WORKSPACE</span><h1>${register ? 'Create your account' : 'Welcome back'}</h1><p>${register ? 'Join your team to plan work and record progress.' : 'Sign in to manage your workday.'}</p></div>
        <form id="auth-form" class="form-stack">
          ${register ? '<label>Full name<input name="name" autocomplete="name" required minlength="2" maxlength="100"></label>' : ''}
          <label>Email address<input type="email" name="email" autocomplete="email" required></label>
          <label>Password<input type="password" name="password" autocomplete="${register ? 'new-password' : 'current-password'}" minlength="8" required></label>
          ${register ? '<p class="muted small">New accounts start with employee access. Your manager can assign your department.</p>' : ''}
          <button class="button primary wide" type="submit">${register ? 'Create account' : 'Sign in'} <span>→</span></button>
          <p class="form-error" id="form-error" role="alert"></p>
        </form>
        <p class="auth-switch">${register ? 'Already have an account?' : 'New to the workspace?'} <a href="#${register ? 'login' : 'register'}">${register ? 'Sign in' : 'Create an account'}</a></p>
        <p class="auth-foot">Secure attendance and daily workflow in one place.</p>
      </section>
      <aside class="auth-aside"><div class="aside-orb"></div><div class="aside-copy"><span class="eyebrow">IRACK WORKFORCE</span><h2>Good work starts with a clear plan.</h2><p>Set your priorities, keep your team in sync, and make progress visible.</p><div class="aside-points"><span>01 <b>Plan the day</b></span><span>02 <b>Track attendance</b></span><span>03 <b>Share progress</b></span></div></div></aside>
    </main>`;
  document.querySelector<HTMLFormElement>('#auth-form')!.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const endpoint = register ? '/api/auth/register' : '/api/auth/login';
    const error = document.querySelector<HTMLElement>('#form-error')!;
    const button = (event.currentTarget as HTMLFormElement).querySelector<HTMLButtonElement>('button')!;
    button.disabled = true;
    error.textContent = '';
    try {
      const result = await api<{ user: User }>(endpoint, { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) });
      user = result.user;
      location.hash = '#dashboard';
      await render();
    } catch (reason) {
      error.textContent = reason instanceof Error ? reason.message : 'Unable to sign in.';
      button.disabled = false;
    }
  });
}

function shell(content: string, active = page): void {
  if (!user) return;
  const nav = [
    ['dashboard', 'Overview', '◫'], ['attendance', 'Punch In/Out', '◷'],
    ['plans', 'Plans & workflow', '▤'], ['reports', 'Reports', '▧'], ['profile', 'Profile', '○'],
  ];
  app.innerHTML = `<div class="app-shell" data-page="${active}">
    <aside class="sidebar"><a class="brand-lockup" href="#dashboard"><img src="/images/logo-circle.png" alt=""><div><b>IRack IT Solution</b><small>WORKFORCE ERP</small></div></a>
      <div class="nav-caption">WORKSPACE</div><nav>${nav.map(([id, label, icon]) => `<a href="#${id}" class="nav-link ${active === id ? 'active' : ''}"><span class="nav-icon">${icon}</span>${label}${id === 'dashboard' ? '<i></i>' : ''}</a>`).join('')}</nav>
      <div class="sidebar-bottom"><div class="support-note"><span class="live-dot"></span><div><b>Workspace is live</b><small>Synced to Nairobi time</small></div></div></div>
    </aside>
    <main class="main-area"><header class="topbar"><div class="mobile-brand"><img src="/images/logo-circle.png" alt=""> IRack Workforce</div><div class="topbar-spacer"></div><div class="account-menu-wrap"><button class="user-menu" id="account-menu-toggle" type="button" aria-label="Open profile menu" aria-haspopup="menu" aria-expanded="false"><div class="avatar">${escapeHtml(user.name.slice(0, 1).toUpperCase())}</div><div class="user-meta"><b>${escapeHtml(user.name)}</b><small>${escapeHtml(user.department ?? 'Profile')}</small></div><span class="chevron">⌄</span></button><div class="account-menu" id="account-menu" role="menu" hidden><a href="#profile" role="menuitem">My profile</a><button type="button" id="menu-signout" role="menuitem">↪ <span>Sign out</span></button></div></div></header>
      <section class="page-content">${content}</section>
    </main>
  </div><dialog id="logout-dialog" class="dialog logout-dialog"><div class="dialog-form"><h2>Sign out?</h2><p>Are you sure you want to sign out?</p><div class="dialog-actions"><button type="button" class="button secondary" id="cancel-signout">Cancel</button><button type="button" class="button danger" id="confirm-signout">Sign out</button></div></div></dialog>`;
}

function connectLive(): void {
  if (!user || (liveSocket && (liveSocket.readyState === WebSocket.OPEN || liveSocket.readyState === WebSocket.CONNECTING))) return;
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${scheme}//${location.host}/api/live`);
  liveSocket = socket;
  socket.onmessage = () => {
    if (user && document.visibilityState === 'visible' && !document.querySelector('dialog[open]')) {
      render().catch(showError);
    }
  };
  socket.onclose = () => {
    if (liveSocket === socket && user) reconnectTimer = window.setTimeout(connectLive, 2000);
  };
  socket.onerror = () => socket.close();
}

async function renderDashboard(): Promise<void> {
  const data = await api<Data>('/api/dashboard');
  const dashboardIsVisible = app.querySelector('.app-shell')?.getAttribute('data-page') === 'dashboard';
  if (dashboardIsVisible && dashboardData && JSON.stringify(data) === JSON.stringify(dashboardData)) return;
  dashboardData = data;
  const attendance = data.attendance;
  const myPunch = attendance.today;
  const manager = user?.role === 'manager' || user?.role === 'admin';
  const currentPlan = data.plans.today;
  const currentReport = data.reports.today;
  const days = data.days as Array<{ date: string; dayName: string; hours: number; status: string; isToday: boolean }>;
  const maxHours = Math.max(8, ...days.map((day) => day.hours));
  const chart = days.map((day) => `<div class="chart-day"><div class="bar-track"><div class="bar ${day.isToday ? 'today' : ''}" style="height:${Math.max(3, day.hours / maxHours * 100)}%" title="${day.hours.toFixed(1)} hours"></div><span class="target-line"></span></div><b>${escapeHtml(day.dayName)}</b><small>${day.hours ? `${day.hours.toFixed(1)}h` : '—'}</small></div>`).join('');
  const recent = (attendance.recent as Array<any>).map((row) => `<tr><td>${fmtDate(row.date, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</td><td>${fmtTime(row.punch_in)}</td><td>${fmtTime(row.punch_out)}</td><td>${row.total_hours ? `${Number(row.total_hours).toFixed(2)} hrs` : '—'}</td><td>${badge(row.status)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty-cell">No attendance records yet.</td></tr>';
  shell(`<div class="page-heading"><div><span class="eyebrow">${fmtDate(data.today, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span><h1>Welcome back, ${escapeHtml(user?.name.split(' ')[0])}</h1><p>Here’s how your workday is shaping up.</p></div><div class="heading-actions">${!manager ? `<button class="button ${myPunch?.punch_in ? 'secondary' : 'primary'}" id="quick-in">${myPunch?.punch_in ? 'Update punch in' : 'Punch in'}</button><button class="button danger" id="quick-out" ${myPunch?.punch_in ? '' : 'disabled'}>${myPunch?.punch_out ? 'Update punch out' : 'Punch out'}</button>` : ''}<button class="icon-button" id="refresh" title="Refresh dashboard">↻</button></div></div>
    <div class="metric-grid">
      <article class="metric-card"><div class="metric-label">Attendance rate <span class="metric-icon mint">◷</span></div><div class="metric-value">${attendance.rate}<small>%</small></div><div class="metric-foot"><span class="trend-dot"></span>${attendance.weekRate}% this week <span class="muted">· weekdays attended</span></div></article>
      <article class="metric-card"><div class="metric-label">Hours worked <span class="metric-icon blue">◴</span></div><div class="metric-value">${Number(attendance.hoursWeek).toFixed(1)}<small> hrs</small></div><div class="metric-foot">${Number(attendance.hoursMonth).toFixed(1)} hrs logged this month</div></article>
      <article class="metric-card"><div class="metric-label">On-time arrival <span class="metric-icon amber">◷</span></div><div class="metric-value">${attendance.onTime}<small>%</small></div><div class="metric-foot">Cutoff at 09:00 · punctuality score</div></article>
      <article class="metric-card"><div class="metric-label">Plan completion <span class="metric-icon violet">✓</span></div><div class="metric-value">${data.plans.completion}<small>%</small></div><div class="metric-foot">Average progress in submitted reports</div></article>
    </div>
    <div class="dashboard-grid"><article class="panel hours-panel"><div class="panel-heading"><div><h2>Work hours this week</h2><p>Standard reference: 8 hours each workday</p></div><span class="total-hours">${Number(attendance.hoursWeek).toFixed(1)}h <small>week total</small></span></div><div class="chart">${chart}</div><div class="legend"><span><i></i> Hours worked</span><span><i></i> 8h daily target</span></div></article>
      <article class="panel workflow-panel"><div class="panel-heading"><div><h2>Today’s workflow</h2><p>${fmtDate(data.today)}</p></div><span class="live-pill"><i></i> LIVE</span></div>
        <div class="workflow-item"><div class="workflow-symbol plan-symbol">▤</div><div class="workflow-copy"><div class="workflow-title">Daily plan ${currentPlan ? badge(currentPlan.status) : '<span class="badge required">Required</span>'}</div><p>${currentPlan ? escapeHtml(currentPlan.title) : 'Set your daily goals before starting work.'}</p><a href="#plans">${currentPlan ? 'Review plan' : '+ Write today’s plan'} →</a></div></div>
        <div class="workflow-item"><div class="workflow-symbol report-symbol">▧</div><div class="workflow-copy"><div class="workflow-title">Daily report ${currentReport ? `<span class="badge completed">${currentReport.percentage}% complete</span>` : '<span class="badge due">Due end of day</span>'}</div><p>${currentReport ? escapeHtml(currentReport.description) : 'Record your accomplishments before punching out.'}</p><a href="#reports">${currentReport ? 'Review report' : '+ Submit today’s report'} →</a></div></div>
        ${!manager && !myPunch?.punch_in ? '<div class="punch-reminder"><span>◷</span><div><b>Remember to clock in</b><small>Today’s attendance is not recorded yet.</small></div><button class="button small primary" id="workflow-in">Punch in</button></div>' : ''}
      </article></div>
      <article class="panel table-panel"><div class="panel-heading"><div><h2>Recent attendance</h2><p>Your latest punch records and shift hours</p></div><a class="text-link" href="#attendance">Manage punches →</a></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Punch in</th><th>Punch out</th><th>Total hours</th><th>Status</th></tr></thead><tbody>${recent}</tbody></table></div></article>`, 'dashboard');
  document.querySelector('#refresh')?.addEventListener('click', () => render().catch(showError));
  for (const id of ['quick-in', 'workflow-in']) document.querySelector(`#${id}`)?.addEventListener('click', () => doPunch('in'));
  document.querySelector('#quick-out')?.addEventListener('click', () => doPunch('out'));
}

async function doPunch(direction: 'in' | 'out'): Promise<void> {
  try {
    const result = await api<{ message: string }>(`/api/attendance/punch-${direction}`, { method: 'POST', body: '{}' });
    toast(result.message);
    await render();
  } catch (error) { showError(error); }
}

async function renderPlans(): Promise<void> {
  const range = new URLSearchParams(location.hash.split('?')[1] ?? '').get('week') ?? 'this_week';
  const [result, dash] = await Promise.all([api<Data>(`/api/plans?week=${encodeURIComponent(range)}`), api<Data>('/api/dashboard')]);
  const plans = result.plans as Array<any>;
  const rows = plans.map((plan) => `<tr><td><b>${escapeHtml(plan.title)}</b><small class="table-sub">${escapeHtml(plan.description ?? '')}</small></td><td>${fmtDate(plan.plan_date)}</td><td>${escapeHtml(plan.employee_name ?? user?.name)}</td><td>${badge(plan.status)}</td><td>${plan.report_percentage === null ? '—' : `${plan.report_percentage}%`}</td><td>${plan.user_id === user?.id || user?.role === 'manager' || user?.role === 'admin' ? `<select class="status-select" data-plan-id="${plan.id}" aria-label="Change ${escapeHtml(plan.title)} status"><option ${plan.status === 'pending' ? 'selected' : ''} value="pending">Pending</option><option ${plan.status === 'in_progress' ? 'selected' : ''} value="in_progress">In progress</option><option ${plan.status === 'completed' ? 'selected' : ''} value="completed">Completed</option><option ${plan.status === 'missed' ? 'selected' : ''} value="missed">Missed</option></select>` : '—'}</td></tr>`).join('');
  shell(`<div class="page-heading"><div><span class="eyebrow">PLAN YOUR WORK</span><h1>Plans & daily workflow</h1><p>Make your commitments clear and track progress across the week.</p></div><button id="new-plan" class="button primary">＋ New plan</button></div>
    <div class="filter-row"><div class="segmented">${[['this_week', 'This week'], ['last_week', 'Last week'], ['all', 'All plans']].map(([id, title]) => `<a href="#plans?week=${id}" class="${range === id ? 'selected' : ''}">${title}</a>`).join('')}</div><span class="muted">${plans.length} plans</span></div>
    <article class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Plan</th><th>Date</th><th>Employee</th><th>Status</th><th>Report progress</th><th>Update</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="empty-cell">No plans in this period. Create a plan to get started.</td></tr>'}</tbody></table></div></article>
    <dialog id="plan-dialog" class="dialog"><form id="plan-form" class="dialog-form"><button type="button" class="dialog-close" aria-label="Close" data-close>×</button><span class="eyebrow">DAILY WORKFLOW</span><h2>Write a plan</h2><p>Set a clear goal for the day.</p><label>Title<input name="title" required maxlength="255" placeholder="e.g. Complete the network inventory"></label><label>Details<textarea name="description" rows="4" placeholder="Add useful notes or checkpoints"></textarea></label><label>Plan date<input name="plan_date" type="date" value="${todayIso()}" required></label><div class="dialog-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button primary">Save plan</button></div><p class="form-error"></p></form></dialog>`, 'plans');
  document.querySelector('#new-plan')?.addEventListener('click', () => (document.querySelector('#plan-dialog') as HTMLDialogElement).showModal());
  document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((node) => node.addEventListener('click', () => (document.querySelector('#plan-dialog') as HTMLDialogElement).close()));
  document.querySelector('#plan-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget as HTMLFormElement);
    try { const r = await api<{ message: string }>('/api/plans', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) }); toast(r.message); await render(); }
    catch (error) { (document.querySelector('#plan-form .form-error') as HTMLElement).textContent = message(error); }
  });
  document.querySelectorAll<HTMLSelectElement>('.status-select').forEach((select) => select.addEventListener('change', async () => {
    try { await api(`/api/plans/${select.dataset.planId}/status`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) }); toast('Plan status updated.'); await render(); }
    catch (error) { showError(error); }
  }));
}

async function renderReports(): Promise<void> {
  const sort = new URLSearchParams(location.hash.split('?')[1] ?? '').get('sort') ?? 'percentage_desc';
  const [result, plans] = await Promise.all([api<Data>(`/api/reports?sort=${encodeURIComponent(sort)}`), api<Data>('/api/plans?week=all')]);
  const rows = (result.reports as Array<any>).map((report) => `<tr><td>${fmtDate(report.report_date)}</td><td><b>${escapeHtml(report.employee_name)}</b></td><td>${escapeHtml(report.plan_title ?? '—')}</td><td>${escapeHtml(report.description)}</td><td><div class="progress-cell"><span>${report.percentage}%</span><i><b style="width:${report.percentage}%"></b></i></div></td><td>${badge(report.status)}</td><td>${report.start_time ?? '—'}${report.end_time ? ` – ${report.end_time}` : ''}</td></tr>`).join('');
  const canReport = user?.role !== 'manager' && user?.role !== 'admin';
  const activePlans = (plans.plans as Array<any>).filter((item) => ['pending', 'in_progress'].includes(item.status) && item.user_id === user?.id);
  shell(`<div class="page-heading"><div><span class="eyebrow">PROGRESS & OUTCOMES</span><h1>Daily reports</h1><p>Review reported progress and completed work.</p></div>${canReport ? '<button class="button primary" id="new-report">＋ Submit report</button>' : ''}</div>
    <div class="filter-row"><div class="segmented">${[['percentage_desc', 'Progress'], ['date_desc', 'Newest'], ['date_asc', 'Oldest'], ['employee', 'Employee']].map(([id, title]) => `<a href="#reports?sort=${id}" class="${sort === id ? 'selected' : ''}">${title}</a>`).join('')}</div><span class="muted">${result.reports.length} reports</span></div>
    <article class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Date</th><th>Employee</th><th>Linked plan</th><th>Accomplishments</th><th>Progress</th><th>Status</th><th>Time</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="empty-cell">No reports have been submitted yet.</td></tr>'}</tbody></table></div></article>
    ${canReport ? `<dialog id="report-dialog" class="dialog"><form id="report-form" class="dialog-form"><button type="button" class="dialog-close" data-close aria-label="Close">×</button><span class="eyebrow">END OF DAY</span><h2>Submit a daily report</h2><p>Summarize accomplishments and progress.</p><label>Linked plan<select name="plan_id"><option value="">No linked plan</option>${activePlans.map((item) => `<option value="${item.id}">${escapeHtml(item.title)}</option>`).join('')}</select></label><label>Report date<input name="report_date" type="date" value="${todayIso()}" required></label><label>Accomplishments<textarea name="description" required rows="5" placeholder="What did you complete today?"></textarea></label><div class="form-two"><label>Progress (%)<input type="number" name="percentage" min="0" max="100" value="0" required></label><label>Status<select name="status"><option value="on_track">On track</option><option value="delayed">Delayed</option><option value="completed">Completed</option><option value="blocked">Blocked</option></select></label></div><div class="form-two"><label>Start time<input type="time" name="start_time"></label><label>End time<input type="time" name="end_time"></label></div><div class="dialog-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button primary">Submit report</button></div><p class="form-error"></p></form></dialog>` : ''}`, 'reports');
  document.querySelector('#new-report')?.addEventListener('click', () => (document.querySelector('#report-dialog') as HTMLDialogElement).showModal());
  document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((node) => node.addEventListener('click', () => (document.querySelector('#report-dialog') as HTMLDialogElement).close()));
  document.querySelector('#report-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const form = Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement));
    if (!form.plan_id) delete form.plan_id;
    try { const r = await api<{ message: string }>('/api/reports', { method: 'POST', body: JSON.stringify(form) }); toast(r.message); await render(); }
    catch (error) { (document.querySelector('#report-form .form-error') as HTMLElement).textContent = message(error); }
  });
}

async function renderAttendance(): Promise<void> {
  const data = await api<Data>('/api/attendance');
  const current = data.today;
  const manager = user?.role === 'manager' || user?.role === 'admin';
  const rows = (data.attendance as Array<any>).map((row) => `<tr><td>${fmtDate(row.date, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</td><td>${fmtTime(row.punch_in)}</td><td>${fmtTime(row.punch_out)}</td><td>${row.total_hours ? `${Number(row.total_hours).toFixed(2)} hrs` : '—'}</td><td>${badge(row.status)}</td></tr>`).join('');
  shell(`<div class="page-heading"><div><span class="eyebrow">TIME & ATTENDANCE</span><h1>Punch in / out</h1><p>Attendance date follows Africa/Nairobi local time.</p></div></div>
    ${manager ? '<article class="panel notice-panel"><div class="notice-icon">i</div><div><h2>Manager account</h2><p>Manager accounts review team plans and reports. Attendance punches are for employee accounts.</p></div></article>' : `<article class="panel punch-panel"><div><span class="eyebrow">TODAY · ${fmtDate(data.date)}</span><h2>${current?.punch_in ? (current.punch_out ? 'Your shift is complete' : 'You are on shift') : 'Ready to start your day?'}</h2><p>${current?.punch_in ? `Earliest punch-in at ${fmtTime(current.punch_in)}${current.punch_out ? ` · Latest punch-out at ${fmtTime(current.punch_out)}.` : '.'} Record another punch to update today's earliest or latest time.` : 'Punch in to record your attendance for today.'}</p></div><div class="punch-action"><button id="punch-in" class="button ${current?.punch_in ? 'secondary' : 'primary'}">${current?.punch_in ? 'Update punch in' : 'Punch in'} <span>→</span></button><button id="punch-out" class="button danger" ${current?.punch_in ? '' : 'disabled'}>${current?.punch_out ? 'Update punch out' : 'Punch out'} <span>→</span></button></div></article>`}
    <article class="panel table-panel"><div class="panel-heading"><div><h2>Last 7 records</h2><p>Your recent attendance history</p></div></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Punch in</th><th>Punch out</th><th>Total hours</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="empty-cell">No attendance records yet.</td></tr>'}</tbody></table></div></article>`, 'attendance');
  document.querySelector('#punch-in')?.addEventListener('click', () => doPunch('in'));
  document.querySelector('#punch-out')?.addEventListener('click', () => doPunch('out'));
}

async function renderProfile(): Promise<void> {
  shell(`<div class="page-heading"><div><span class="eyebrow">ACCOUNT SETTINGS</span><h1>Your profile</h1><p>Manage your personal information and sign-in security.</p></div></div><div class="profile-grid"><article class="panel profile-panel"><form id="profile-form" class="form-stack"><h2>Personal information</h2><div class="profile-avatar">${escapeHtml(user?.name.slice(0, 1).toUpperCase())}</div><label>Full name<input name="name" value="${escapeHtml(user?.name)}" required minlength="2" maxlength="100"></label><label>Email address<input name="email" type="email" value="${escapeHtml(user?.email)}" required></label><label>Employee ID<input value="${escapeHtml(user?.employee_id ?? 'Not assigned')}" disabled></label><label>Department<input value="${escapeHtml(user?.department ?? 'Not assigned')}" disabled></label><p class="form-error"></p><button class="button primary">Save profile</button></form></article><article class="panel profile-panel"><form id="password-form" class="form-stack"><h2>Change password</h2><p class="muted">Choose a password with at least 8 characters.</p><label>Current password<input name="current_password" type="password" autocomplete="current-password" required></label><label>New password<input name="password" type="password" autocomplete="new-password" minlength="8" required></label><label>Confirm new password<input name="password_confirmation" type="password" autocomplete="new-password" minlength="8" required></label><p class="form-error"></p><button class="button secondary">Update password</button></form></article></div>`, 'profile');
  document.querySelector('#profile-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement));
    try { await api('/api/profile', { method: 'PATCH', body: JSON.stringify(body) }); user = { ...user!, ...body } as User; toast('Profile updated.'); await render(); }
    catch (error) { (document.querySelector('#profile-form .form-error') as HTMLElement).textContent = message(error); }
  });
  document.querySelector('#password-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const form = event.currentTarget as HTMLFormElement;
    const body = Object.fromEntries(new FormData(form));
    try { const result = await api<{ message: string }>('/api/profile/password', { method: 'PATCH', body: JSON.stringify(body) }); toast(result.message); form.reset(); }
    catch (error) { (document.querySelector('#password-form .form-error') as HTMLElement).textContent = message(error); }
  });
}

function message(error: unknown): string { return error instanceof Error ? error.message : 'Something went wrong.'; }
function showError(error: unknown): void { toast(message(error), 'error'); }

async function render(): Promise<void> {
  const hash = location.hash.replace(/^#/, '') || 'dashboard';
  page = hash.split('?')[0] || 'dashboard';
  if (page === 'login' || page === 'register') { authView(page === 'register'); return; }
  if (!user) {
    try { user = (await api<{ user: User }>('/api/auth/me')).user; }
    catch { authView(false); return; }
  }
  connectLive();
  clearInterval(refreshTimer);
  try {
    if (page === 'plans') await renderPlans();
    else if (page === 'reports') await renderReports();
    else if (page === 'attendance') await renderAttendance();
    else if (page === 'profile') await renderProfile();
    else { page = 'dashboard'; await renderDashboard(); }
    if (page === 'dashboard') refreshTimer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || document.querySelector('dialog[open]') || dashboardRefreshInFlight) return;
      dashboardRefreshInFlight = true;
      renderDashboard().catch(showError).finally(() => { dashboardRefreshInFlight = false; });
    }, 10_000);
  } catch (error) {
    if (message(error).includes('Unauthenticated')) { user = null; authView(false); }
    else showError(error);
  }
}

window.addEventListener('hashchange', () => render().catch(showError));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && user && page === 'dashboard') render().catch(showError);
});
render().catch(showError);
