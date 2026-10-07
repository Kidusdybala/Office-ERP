/**
 * Hikvision DS-K3B411SX ↔ Firestore + ERP Bridge
 *
 * Runs locally on the same LAN as the turnstile.
 * Polls /ISAPI/AccessControl/AcsEvent every  every 30 s,
 * matches employeeNo/cardNo → ERP staff badge_number (with Firestore fallback),
 * and writes punches with src:"device" to both Firestore and the ERP database.
 *
 * Usage:
 *   node src/hikvision-bridge.js
 *
 * Env vars (set in .env or export before running):
 *   HIK_HOST      Device IP, e.g. 192.168.1.8
 *   HIK_USER      Device admin username (default: admin)
 *   HIK_PASS      Device admin password
 *   POLL_MS       Poll interval in ms (default: 30000)
 *   GOOGLE_APPLICATION_CREDENTIALS  Path to Firebase service-account JSON
 *                                   (or set FIREBASE_* vars below for inline config)
 *   DB_HOST       PostgreSQL host (optional — if present, punches also go to ERP DB)
 *   DB_PORT       PostgreSQL port (default: 5432)
 *   DB_NAME       PostgreSQL database name (default: office_erp)
 *   DB_USER       PostgreSQL user (default: postgres)
 *   DB_PASS       PostgreSQL password
 */

'use strict';

require('dotenv').config();
const admin   = require('firebase-admin');
const fs      = require('fs');
const path    = require('path');
const axios   = require('axios');
const https   = require('https');

// RFC 2617 / RFC 7616 Digest auth client, proven with Hikvision cameras/controllers.
const AxiosDigest = require('axios-digest').default;

// ── Firebase init ────────────────────────────────────────────────────────────
// Use a service-account JSON file:
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
// OR inline the values in .env as FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL /
// FIREBASE_PRIVATE_KEY and uncomment the credential block below.

let saProjectId = null;
const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (saPath) {
  try {
    const absSaPath = path.isAbsolute(saPath) ? saPath : path.resolve(process.cwd(), saPath);
    if (fs.existsSync(absSaPath)) {
      const sa = JSON.parse(fs.readFileSync(absSaPath, 'utf8'));
      saProjectId = sa.project_id || null;
    }
  } catch (e) { /* ignore parse failures; SDK will handle its own validation */ }
}

if (!admin.apps.length) {
  const credential = process.env.FIREBASE_PRIVATE_KEY
    ? admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    : admin.credential.applicationDefault();

  admin.initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID || saProjectId || 'office-erp-c0a45',
  });
}

const db = admin.firestore();

// ── ERP Postgres helpers (optional — only active when DB_HOST + DB_PASS are set) ──
let query = null;
let createPunch = null;
let getByStaffAndDay = null;
const pgActive = !!(process.env.DB_HOST && process.env.DB_PASS);
if (pgActive) {
  try {
    const { query: pgQuery } = require('./config/db');
    query = pgQuery;
    const P = require('./models/Punch');
    createPunch = P.create;
    getByStaffAndDay = P.getByStaffAndDay;
  } catch (e) {
    console.warn('[warn] ERP DB helpers failed to load, Firestore-only mode:', e.message);
  }
}

// ── Config ───────────────────────────────────────────────────────────────────
const HIK_HOST = process.env.HIK_HOST || '192.168.1.8';
const HIK_USER = process.env.HIK_USER || 'admin';
const HIK_PASS = process.env.HIK_PASS || '';
const POLL_MS  = parseInt(process.env.POLL_MS || '30000', 10);

// Track the timestamp of the last event we processed so we don't re-import.
let lastEventTime = new Date(Date.now() - POLL_MS * 2); // start from 2 polls ago

// ── HTTP client (digest auth via axios-digest, RFC 2617 / RFC 7616 compliant,
//    with optional Basic-auth fallback for older firmware that accepts either) ──
const AUTH_TYPE = (process.env.HIK_AUTH_TYPE || 'auto').toLowerCase(); // auto | digest | basic

function basicAuthHeader(user, pass) {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

let _axiosInstance = null;
function getAxiosInstance() {
  if (_axiosInstance) return _axiosInstance;
  const rawHost = HIK_HOST.replace(/^https?:\/\//, '');
  const isHttps = HIK_HOST.startsWith('https');
  const baseURL = `${isHttps ? 'https' : 'http'}://${rawHost}`;
  _axiosInstance = axios.create({
    baseURL,
    timeout: 15000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    transitional: { silentJSONParsing: false, forcedJSONParsing: false, clarifyTimeoutError: false },
  });
  _axiosInstance.defaults.headers.common['Accept'] = 'application/json,text/html,application/xml;q=0.9,*/*;q=0.8';
  return _axiosInstance;
}

let _axiosDigest = null;
function getAxiosDigest() {
  if (_axiosDigest) return _axiosDigest;
  _axiosDigest = new AxiosDigest(HIK_USER, HIK_PASS, getAxiosInstance());
  return _axiosDigest;
}

async function request(method, reqPath, body) {
  const client = getAxiosInstance();
  const debug = process.env.HIK_DEBUG === '1';
  if (debug) console.error(`[debug] ${method} ${reqPath} (auth=${AUTH_TYPE})`);

  const callConfig = {
    method,
    url: reqPath,
    headers: {},
  };
  if (body) {
    callConfig.data = body;
    callConfig.headers['Content-Type'] = 'application/json';
  }

  // Try Basic first if configured
  if (AUTH_TYPE === 'basic' || AUTH_TYPE === 'auto') {
    try {
      callConfig.headers['Authorization'] = basicAuthHeader(HIK_USER, HIK_PASS);
      const resp = await client.request(callConfig);
      if (resp.status < 400) return normalize(resp.data);
      if (debug) console.error(`[debug] Basic auth returned ${resp.status}, trying Digest`);
      delete callConfig.headers['Authorization'];
    } catch (err) {
      const st = err?.response?.status;
      if (debug) console.error(`[debug] Basic auth error: ${st || err.message}`);
      if (st !== 401 && st !== 403) throw err;
    }
  }

  // Try Digest (either primary, or fallback when auto + basic failed)
  if (AUTH_TYPE !== 'basic') {
    const dig = getAxiosDigest();
    let resp;
    if (method === 'GET')       resp = await dig.get(reqPath);
    else if (method === 'POST') resp = await dig.post(reqPath, body, { headers: callConfig.headers });
    else throw new Error(`Unsupported HTTP method: ${method}`);
    return normalize(resp.data);
  }

  throw new Error('No auth strategy succeeded');
}

function normalize(data) {
  if (!data) return '';
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return data; }
  }
  return data;
}

// ── DeviceInfo check on startup ──────────────────────────────────────────────────────
async function checkDevice() {
  const info = await request('GET', '/ISAPI/System/deviceInfo');
  return typeof info === 'string' ? info.slice(0, 300) : info;
}

// ── Fetch events from device ─────────────────────────────────────────────────
async function fetchEvents(since) {
  // ISAPI: search access control events
  // Doc: /ISAPI/AccessControl/AcsEvent?format=json
  const fmt  = d => d.toISOString().slice(0, 19);          // "2026-10-07T08:00:00"
  const now  = new Date();
  const body = {
    AcsEventCond: {
      searchID:      '1',
      searchResultPosition: 0,
      maxResults:    100,
      major:         0,
      minor:         0,
      startTime:     fmt(since),
      endTime:       fmt(now),
    }
  };

  const res = await request('POST', '/ISAPI/AccessControl/AcsEvent?format=json', body);

  // Hikvision returns either {AcsEvent:{InfoList:[...]}} (JSON) or XML.
  let events = [];
  if (res && typeof res === 'object') {
    events = res?.AcsEvent?.InfoList || res?.InfoList || [];
  } else if (typeof res === 'string' && res.trim().startsWith('<?xml')) {
    if (!process.env.HIK_NO_DUMP) {
      try { fs.writeFileSync(path.join(__dirname, '..', 'last-event.xml'), res); } catch {}
      process.env.HIK_NO_DUMP = '1'; // only dump once
    }
    // Try-parse XML to JS using a minimal regex extractor
    events = parseEventsFromXml(res);
  }
  return { events, now, raw: res };
}

// ── Minimal XML event extractor (used as fallback for Hikvision XML responses
function parseEventsFromXml(xml) {
  const blocks = xml.split(/<Info>|/g).slice(1).map(s => s.replace(/<\/Info>.*$/, ''));
  const out = [];
  for (const b of blocks) {
    const get = tag => {
      const m = b.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return m ? m[1].trim() : '';
    };
    const ev = {
      major:          +get('major') || 0,
      minor:          +get('minor') || 0,
      time:            get('time')  || get('dateTime') || get('Time') || '',
      employeeNoString: get('employeeNoString') || get('employeeNo') || '',
      employeeNo:      get('employeeNo') || '',
      cardNo:          get('cardNo') || '',
      name:            get('name') || '',
    };
    out.push(ev);
  }
  return out;
}

// ── Match event → ERP staff (with Firestore fallback) ─────────────────────────
let staffCache = [];
let staffCacheAt = 0;

async function getStaff() {
  if (Date.now() - staffCacheAt < 60_000 && staffCache.length > 0) return staffCache;
  try {
    const snap = await db.collection('staff').get();
    staffCache  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    staffCacheAt = Date.now();
  } catch (e) {
    console.error('[error] Firestore staff fetch failed:', e.message);
  }
  return staffCache;
}

function matchStaff(staff, ev) {
  const empNo = String(ev.employeeNoString || ev.employeeNo || '').trim();
  const card  = String(ev.cardNo || '').trim();
  if (!empNo && !card) return null;
  return staff.find(s =>
    (empNo && s.badge && String(s.badge).trim() === empNo) ||
    (card  && s.badge && String(s.badge).trim() === card)
  ) || null;
}

// ── Write punch to Firestore + ERP database ───────────────────────────────────
const pad = n => String(n).padStart(2, '0');
const dk  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

async function writePunch(staffDoc, ts) {
  const uid  = staffDoc.id;
  const day  = dk(new Date(ts));

  // Determine in/out by counting existing punches that day
  let dayCount = 0;
  if (pgActive && getByStaffAndDay && staffDoc.erpId) {
    try {
      const erpPunches = await getByStaffAndDay(staffDoc.erpId, day);
      dayCount = erpPunches.length;
    } catch (err) {
      console.warn('[warn] ERP punch count failed, using Firestore:', err.message);
    }
  }
  // Fallback: Firestore count
  if (!dayCount) {
    try {
      const snap = await db.collection('punches')
        .where('uid', '==', uid)
        .get();
      dayCount = snap.docs.filter(d => dk(new Date(d.data().ts)) === day).length;
    } catch {}
  }
  const type = dayCount % 2 === 0 ? 'in' : 'out';

  // Write to Firestore for frontend compatibility
  try {
    const docId = `${uid}_${ts}`;
    await db.collection('punches').doc(docId).set({
      uid, ts, type, src: 'device'
    });
  } catch (err) {
    console.warn('[warn] Firestore write failed:', err.message);
  }

  // Write to ERP database (optional)
  if (pgActive && createPunch && staffDoc.erpId) {
    try {
      await createPunch(staffDoc.erpId, ts, type, 'device');
    } catch (err) {
      console.error('[error] ERP punch write failed:', err.message);
    }
  }

  console.log(`[punch] ${staffDoc.name || uid}  ${type}  ${new Date(ts).toISOString()}`);
}

// ── Main poll loop ────────────────────────────────────────────────────────
const seen = new Set(); // deduplicate within session

async function poll() {
  try {
    const staff = await getStaff();
    const { events, now } = await fetchEvents(lastEventTime);

    let count = 0;
    // Sort ascending so in/out order is correct
    const sorted = [...events].sort((a, b) =>
      new Date(a.time || a.dateTime || 0) - new Date(b.time || b.dateTime || 0)
    );

    for (const ev of sorted) {
      // Skip non-access events (e.g. "Climbing Over Barrier" alarm = major 5)
      // Accept only major 1 (device), 3 (alarm door), or events with a valid employeeNo
      const major = ev.major ?? -1;
      const empNo = String(ev.employeeNoString || ev.employeeNo || '').trim();
      if (!empNo && major !== 1 && major !== 3) continue;

      const evTime = new Date(ev.time || ev.dateTime);
      if (isNaN(evTime)) continue;

      const ts  = evTime.getTime();
      const key = `${empNo || ev.cardNo}_${ts}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const matched = matchStaff(staff, ev);
      if (!matched) {
        if (empNo) console.log(`[skip] unknown badge/empNo: ${empNo}`);
        continue;
      }

      await writePunch(matched, ts);
      count++;
    }

    if (count > 0) console.log(`[poll] wrote ${count} new punch(es)`);
    else           process.stdout.write('.');

    lastEventTime = now;
  } catch (err) {
    console.error(`\n[error] ${err.message}`);
  }
}

// ── Startup ──────────────────────────────────────────────────────────────────
(async function start() {
  console.log(`Hikvision Bridge starting`);
  console.log(`  Device  : http://${HIK_HOST}`);
  console.log(`  User    : ${HIK_USER}`);
  console.log(`  Poll    : every ${POLL_MS / 1000}s`);
  console.log(`  Firebase: ${process.env.FIREBASE_PROJECT_ID || saProjectId || 'office-erp-c0a45'}`);
  if (pgActive) {
    console.log(`  ERP DB  : ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'office_erp'}`);
  } else {
    console.log(`  ERP DB  : (disabled — set DB_HOST and DB_PASS to enable)`);
  }
  if (saPath) {
    const absSa = path.isAbsolute(saPath) ? saPath : path.resolve(process.cwd(), saPath);
    const found = fs.existsSync(absSa);
    console.log(`  SA JSON : ${found ? 'found' : 'MISSING'} — ${absSa}`);
  }
  console.log('');

  try {
    const info = await checkDevice();
    console.log('[ok] Device reachable and authenticated. deviceInfo:');
    const snippet = typeof info === 'string' ? info.replace(/\s+/g, ' ').slice(0, 200) : JSON.stringify(info).slice(0, 200);
    console.log('      ' + snippet);
  } catch (e) {
    // Warn but DON'T abort — device may temporarily unavailable; poll loop will keep trying
    console.warn('[warn] Initial device check failed (continuing to poll anyway):');
    console.warn('       ' + e.message);
    console.warn('       → If this persists, double-check HIK_HOST / HIK_USER / HIK_PASS in backend/.env');
    console.warn('       → This script must run from a machine on the SAME LAN as the device');
    console.warn('         (cannot access a private 192.168.x.x IP from outside the office network)');
  }
  console.log('');

  poll(); // run immediately on start
  setInterval(poll, POLL_MS);
})().catch(e => { console.error(e); process.exit(1); });
