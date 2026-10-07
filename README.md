# WorkTime ERP – attendance, plans/reports & performance

## Layout
- `src/app.js` – all app logic (punch, plans, reports, stats, manager dashboard, employees, Hikvision import)
- `src/styles.css`, `src/body.html` – styling and page shell
- `src/mock-claude.js` – local fake of the Claude Artifact runtime (`claude.use("db")`, `claude.use("user")`) using localStorage
- `index.html` – dev entry (uses the mock)
- `build.py` – bundles everything into `dist/workforce-erp.html` (no mock)

## Run locally
    python3 -m http.server 8000
- Manager: http://localhost:8000/index.html?as=manager
- Employee: http://localhost:8000/index.html?as=emp&email=sara@company.com&name=Sara
(Add the employee in the manager's Employees tab first, then open the employee URL and link with the 6-digit code.)
All data is shared between tabs through localStorage of the same browser.

## Publish
    python3 build.py
Publish `dist/workforce-erp.html` as a Claude Artifact with capabilities
`db` (rules: `evals` and `settings` read=view, write=admin) and `user` (scopes: profile).

## Data model (collections)
- `staff/{uid | inv:email}` name, email, dept, badge, days, active, code, mgr
- `punches/{uid_timestamp}` uid, ts, type (in|out), src (web|device)
- `notes/{uid_kind_key}` kind = daily-plan | daily-report | weekly-plan | weekly-report
- `evals/{uid_weekMonday}` q[3], rating, comment
- `settings/shift` start, end (default 08:10 / 17:30)

## Score
attendance 40 + punctuality 20 + reports 20 + manager rating 20 (without rating: the other three scaled to 100).
Attendance = days with both IN and OUT / scheduled days elapsed.

## Moving to a real backend (next step)
`db`/`user` calls are the only platform-specific parts. Replace them with your API (e.g. Node/Express or Django + PostgreSQL,
real email+password auth with hashed passwords, per-role permissions) and add a Hikvision bridge that
receives ISAPI access events from the DS-K3B411SX (`/ISAPI/AccessControl/AcsEvent`) and writes `punches` with `src:"device"`.
