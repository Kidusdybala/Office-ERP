/**
 * Hikvision DS-K3B411SX ↔ Firestore + ERP Bridge
 *
 * Runs locally on the same LAN as the turnstile.
 * Polls /ISAPI/AccessControl/AcsEvent every 30 s,
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
 *   DB_HOST       PostgreSQL host (default: localhost)
 *   DB_PORT       PostgreSQL port (default: 5432)
 *   DB_NAME       PostgreSQL database name (default: office_erp)
 *   DB_USER       PostgreSQL user (default: postgres)
 *   DB_PASS       PostgreSQL password
 */

'use strict';

require('dotenv').config();
const http    = require('http');
const https   = require('https');
const admin   = require('firebase-admin');

// ── Firebase init ────────────────────────────────────────────────────────────
// Use a service-account JSON file:
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
// OR inline the values in .env as FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL /
// FIREBASE_PRIVATE_KEY and uncomment the credential block below.

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
    projectId: process.env.FIREBASE_PROJECT_ID || 'office-erp-c0a45',
  });
}

const db = admin.firestore();

// ── Config ───────────────────────────────────────────────────────────────────
const HIK_HOST = process.env.HIK_HOST || '192.168.1.8';
const HIK_USER = process.env.HIK_USER || 'admin';
const HIK_PASS = process.env.HIK_PASS || '';
const POLL_MS  = parseInt(process.env.POLL_MS || '30000', 10);

// Track the timestamp of the last event we processed so we don't re-import.
let lastEventTime = new Date(Date.now() - POLL_MS * 2); // start from 2 polls ago

// ── Digest-auth helper ───────────────────────────────────────────────────────
// Hikvision devices use HTTP Digest authentication.
const { createHash } = require('crypto');

function md5(s) { return createHash('md5').update(s).digest('hex'); }

function buildDigestHeader(method, uri, wwwAuth, user, pass) {
  const realm  = (wwwAuth.match(/realm="([^"]*)"/) || [])[1] || '';
  const nonce  = (wwwAuth.match(/nonce="([^"]*)"/) || [])[1] || '';
  const qop    = (wwwAuth.match(/qop="?([^",]*)"?/) || [])[1] || '';
  const nc     = '00000001';
  const cnonce = Math.random().toString(36).slice(2, 10);
  const ha1    = md5(`${user}:${realm}:${pass}`);
  const ha2    = md5(`${method}:${uri}`);
  const resp   = qop
    ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${nonce}:${ha2}`);

  let h = `Digest username="${user}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${resp}"`;
  if (qop)    h += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
  return h;
}

// ── HTTP request with Digest auth (2-step) ───────────────────────────────────
// Step 1: GET /ISAPI/System/deviceInfo to harvest the Digest nonce (safe GET endpoint).
// Step 2: Send the real request (any method/path) with the harvested nonce.
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const rawHost = HIK_HOST.replace(/^https?:\/\//, '');
    const [host, port] = rawHost.includes(':') ? rawHost.split(':') : [rawHost, 80];
    const proto   = HIK_HOST.startsWith('https') ? https : http;
    const bodyBuf = body ? Buffer.from(JSON.stringify(body)) : null;

    // Step 1: GET a known-good endpoint to receive 401 + WWW-Authenticate
    const challengePath = '/ISAPI/System/deviceInfo';
    const opts1 = { host, port: +port, path: challengePath, method: 'GET',
      headers: { 'Accept': 'application/json' } };

    const step1 = proto.request(opts1, (res) => {
        const wwwAuth = res.headers['www-authenticate'] || '';
        res.resume(); // drain body
        if (res.statusCode !== 401) {
          if (res.statusCode === 200 && !wwwAuth) {
            // Device has no auth — just do the real request directly
            return doRequest(null);
          }
          return reject(new Error(`Expected 401 on auth challenge, got ${res.statusCode}`));
        }
        if (!wwwAuth) return reject(new Error('No WWW-Authenticate header from device'));
        doRequest(wwwAuth);
      });
    step1.on('error', reject);
    step1.end();

    function doRequest(wwwAuth) {
        const headers2 = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (wwwAuth) headers2['Authorization'] = buildDigestHeader(method, path, wwwAuth, HIK_USER, HIK_PASS);
        if (bodyBuf) headers2['Content-Length'] = bodyBuf.length;

        const step2 = proto.request({ host, port: +port, path, method, headers: headers2 }, (res2) => {
          let data = '';
          res2.on('data', c => data += c);
          res2.on('end', () => {
            if (res2.statusCode >= 400) {
              return reject(new Error(`Device ${res2.statusCode}: ${data.slice(0, 300)}`));
            }
            try { resolve(JSON.parse(data)); }
            catch { resolve(data); }
          });
        });
        step2.on('error', reject);
        if (bodyBuf) step2.write(bodyBuf);
        step2.end();
    }
  });
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
  const list = res?.AcsEvent?.InfoList || [];
  return { events: list, now };
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
  try {
    const erpPunches = staffDoc.erpId
      ? await getByStaffAndDay(staffDoc.erpId, day)
      : [];
    dayCount = erpPunches.length;
  } catch (err) {
    console.warn('[warn] ERP punch count failed, using Firestore:', err.message);
    if (!admin.apps.length) {
      console.error('[error] No Firestore available for fallback count');
    } else {
      const snap = await db.collection('punches')
        .where('uid', '==', uid)
        .get();
      dayCount = snap.docs.filter(d => dk(new Date(d.data().ts)) === day).length;
    }
  }
  const type = dayCount % 2 === 0 ? 'in' : 'out';

  // Write to Firestore for frontend compatibility
  if (admin.apps.length) {
    try {
      const docId = `${uid}_${ts}`;
      await db.collection('punches').doc(docId).set({
        uid, ts, type, src: 'device'
      });
    } catch (err) {
      console.warn('[warn] Firestore write failed:', err.message);
    }
  }

  // Write to ERP database
  if (staffDoc.erpId) {
    try {
      await createPunch(staffDoc.erpId, ts, type, 'device');
    } catch (err) {
      console.error('[error] ERP punch write failed:', err.message);
    }
  }

  console.log(`[punch] ${staffDoc.name || uid}  ${type}  ${new Date(ts).toISOString()}`);
}

// ── Main poll loop ────────────────────────────────────────────────────────────
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

// ── Startup ───────────────────────────────────────────────────────────────────
console.log(`Hikvision Bridge starting`);
console.log(`  Device : http://${HIK_HOST}`);
console.log(`  Poll   : every ${POLL_MS / 1000}s`);
console.log(`  Firebase: ${process.env.FIREBASE_PROJECT_ID || 'office-erp-c0a45'}`);
console.log('');

poll(); // run immediately on start
setInterval(poll, POLL_MS);
