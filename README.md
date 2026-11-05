# WorkTime ERP – attendance, plans/reports & performance

## Layout
- `frontend/src/` – WorkTime ERP interface, Firebase integration, dashboards, employee tools, and Hikvision event import.
- `frontend/index.html` – browser entry point for the Vercel deployment.
- `backend/src/hikvision-bridge.js` – local bridge that polls Hikvision ISAPI and writes attendance punches to Firestore.
- `backend/.env` and `backend/serviceAccount.json` – local-only device and Firebase credentials; these are excluded from Git.

## Run locally
Open `frontend/index.html` through a local web server, or use the Vercel deployment. The interface uses the Office ERP Firebase project for sign-in and data.

Run the Hikvision bridge on a computer on the same LAN as the turnstile:

    cd backend
    npm install
    npm run bridge

Set `HIK_HOST`, `HIK_USER`, `HIK_PASS`, and `GOOGLE_APPLICATION_CREDENTIALS` in the ignored local `backend/.env`. Add the Hikvision employee number to the employee's ERP `badge` field. The bridge matches that field and records access events as punches.

## Build a standalone artifact
    cd frontend
    python3 build.py

The generated file is `frontend/dist/workforce-erp.html`. The Vercel deployment serves `frontend/index.html` directly.

## Data model (collections)
- `staff/{uid | inv:email}` name, email, dept, badge, days, active, code, mgr
- `punches/{uid_timestamp}` uid, ts, type (in|out), src (web|device)
- `notes/{uid_kind_key}` kind = daily-plan | daily-report | weekly-plan | weekly-report
- `evals/{uid_weekMonday}` q[3], rating, comment
- `settings/shift` start, end (default 08:10 / 17:30)

## Score
attendance 40 + punctuality 20 + reports 20 + manager rating 20 (without rating: the other three scaled to 100).
Attendance = days with both IN and OUT / scheduled days elapsed.

