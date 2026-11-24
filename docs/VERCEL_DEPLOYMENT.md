# NEXUS deployment on Vercel

NEXUS is a monorepo with a Create React App frontend and an Express/MongoDB
backend. Deploy them as two Vercel projects from the same Git repository so the
frontend can build independently and the backend can use its own serverless
runtime and environment variables.

## Before connecting the repository

- Do not publish `backend/.env`, `.env.local`, demo credential workbooks, or
  uploaded files. `backend/.env` was already tracked by the current local Git
  base commit; remove it from the published tree and rotate any values that
  were ever deployed or shared. A normal follow-up commit does not erase secrets
  from Git history. Publish from a clean history or use GitHub's documented
  secret-removal procedure if that history is already on a remote.
- Keep `demo-files/` local. It contains reusable demo passwords and is excluded
  by the repository ignore rules.
- Use a production MongoDB database and a unique `JWT_SECRET` of at least 32
  bytes. Do not use `nexus_demo` or the demo workbook accounts in production.

## Vercel projects

Create two projects from the same repository:

### Frontend project

- Root Directory: `frontend`
- Framework: Create React App
- Build command: `npm run build`
- Output directory: `build`
- Add `REACT_APP_API_URL` as a production build variable, set to the backend
  project's HTTPS origin plus `/api`, for example
  `https://nexus-api.example.vercel.app/api`.
- `frontend/vercel.json` routes React Router deep links back to the app shell.

### Backend project

- Root Directory: `backend`
- Framework: Express (Vercel's Node.js runtime)
- Entry point: `server.js`
- Set these runtime variables in Vercel's project settings:
  - `MONGO_URI`: production MongoDB connection string; allowlist Vercel's
    outbound network as required by the MongoDB provider.
  - `MONGO_DB_NAME`: production database name.
  - `JWT_SECRET`: unique production secret, at least 32 bytes.
  - `CORS_ORIGINS`: the exact HTTPS frontend origin, without a path.
  - `FRONTEND_URL` and `APP_PUBLIC_URL`: the frontend HTTPS origin.
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and, if required, `SMTP_USER`,
    `SMTP_PASSWORD`, and `SMTP_SECURE` for verification email delivery.
  - `NEXUS_DEMO_MODE=false`.
- Never set `NEXUS_DEMO_MODE=true` in production.

Deploy the backend first, set its URL in the frontend build variable, then
deploy the frontend. Redeploy the frontend after changing
`REACT_APP_API_URL`, because CRA embeds this variable at build time. Verify
`/health`, login, parent verification email, role APIs, QR scan/exit/return, and
direct navigation to React routes on the deployed origins.

## Scheduled work

The current backend schedules assignment and gatepass expiry jobs with
`node-cron`. In-process timers are not a reliable scheduler in serverless
functions. Production must run these jobs through a persistent worker or an
authenticated external/Vercel Cron endpoint on a plan and schedule appropriate
to the required five-minute cadence before relying on automatic expiry and
missed-submission processing.

## Publish and deployment status

The sanitized application source has been published on the `main` branch of
`https://github.com/KRISH2926/Nexus`. The local environment file and demo
credential workbook are excluded from the published tree.

Vercel deployment still requires a connected Vercel account and the production
MongoDB, JWT, CORS, and email-delivery settings described above. Set secrets
directly in Vercel's project settings; do not commit them or share them in chat.
