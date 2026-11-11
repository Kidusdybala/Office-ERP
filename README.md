# IRack Workforce ERP on Cloudflare Workers

This project runs as a TypeScript Cloudflare Worker. The UI is built as a static app and served by Worker Assets; application records and sessions live in Cloudflare D1. The app uses Africa/Nairobi local time.

Authenticated browsers connect to a Durable Object WebSocket channel. Attendance, plans, reports, and profile changes broadcast refresh events so open sessions update immediately; the dashboard keeps a 30-second refresh as a fallback if the socket disconnects.

## Local development

Requirements: Node.js 22 or newer and a Cloudflare account for remote deployment.

```sh
npm install
npm run build
npx wrangler d1 migrations apply irack-workforce-erp --local
npm run cf:dev
```

The local D1 database is created under Wrangler's local state directory. It is separate from the old Laravel SQLite file at `database/database.sqlite`.

## First Cloudflare deployment

1. Authenticate the Wrangler CLI with `npx wrangler login`.
2. Create the D1 database: `npx wrangler d1 create irack-workforce-erp`.
3. Copy the database ID returned by Wrangler into `wrangler.jsonc`, replacing `REPLACE_WITH_D1_DATABASE_ID`.
4. Apply the schema: `npx wrangler d1 migrations apply irack-workforce-erp --remote`.
5. Set the Hikvision webhook secret if the integration is used: `npx wrangler secret put HIKVISION_WEBHOOK_TOKEN`.
6. Build and deploy: `npm run build` followed by `npm run cf:deploy`.

Cloudflare serves the app and API from one Worker. The SPA assets and API routes are deployed together. Use the Worker's `*.workers.dev` URL for an initial smoke check, then attach a custom domain from the Cloudflare dashboard.

## Accounts and access

Register through the app to create an employee account. New registrations cannot grant themselves manager access. After creating the account, an authorized operator can assign its role and employee ID with D1 SQL, for example:

```sh
npx wrangler d1 execute irack-workforce-erp --remote --command "UPDATE users SET role = 'manager' WHERE email = 'manager@example.com'"
npx wrangler d1 execute irack-workforce-erp --remote --command "UPDATE users SET employee_id = 'EMP-001', department_id = (SELECT id FROM departments WHERE name = 'IT Department') WHERE email = 'employee@example.com'"
```

Departments can be added with `INSERT INTO departments (name) VALUES ('IT Department')` using the same `wrangler d1 execute` command. Avoid putting real passwords or API tokens into SQL history, source files, or Git.

## Data migration

The old local SQLite database is not part of this deployment and is ignored by Git. The new D1 database starts empty. Export and migrate existing employee, department, attendance, plan, and report records separately before switching staff to the Worker URL. Password hashes from Laravel are not compatible with this app's PBKDF2 password format, so users should register new accounts or use a purpose-built account migration process.

## Hikvision

`POST /hikvision/events` accepts JSON or XML access-controller events and requires an `Authorization: Bearer <token>` header matching the `HIKVISION_WEBHOOK_TOKEN` Worker secret. Only successful face-required access events are counted, and one punch-in per employee per Nairobi calendar day is recorded. This Worker endpoint replaces the Laravel webhook receiver; a continuously running outbound ISAPI listener is not included in Workers.

## Vercel frontend

The Vercel project can host the static Vite frontend while `vercel.json` proxies `/api/*` requests to the Cloudflare Worker. Keep `APP_ORIGIN` in `wrangler.jsonc` aligned with the production Vercel origin so same-origin checks and session cookies work through the rewrite. The Cloudflare Worker remains the API and D1 runtime.
