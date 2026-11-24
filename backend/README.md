# Backend configuration

The backend requires `JWT_SECRET` to contain at least 32 bytes. It refuses to
start if the secret is missing or too short.

For local development, create `backend/.env.local` and set `JWT_SECRET` there.
That file is ignored by Git. Generate a value locally with:

```sh
node -p "require('crypto').randomBytes(32).toString('hex')"
```

Start the isolated demo database without changing your normal local database
selection with `npm run demo` from `backend/`. This explicit mode always
selects the `nexus_demo` database and enables local-only demo email links.
Normal startup (`npm start` or `npm run dev`) uses the configured database.

For deployment, provide `JWT_SECRET` through the hosting platform's secret
configuration instead of committing it to an environment file. Rotating this
secret invalidates existing JWTs, so users will need to sign in again.

Signup email delivery is optional. Configure `SMTP_HOST`, `SMTP_PORT`, and
`SMTP_FROM` to send verification emails. `SMTP_USER` and `SMTP_PASSWORD` are
optional and must be provided together when the relay requires authentication;
`SMTP_SECURE=true` enables TLS (port 465 is secure by default). Set
`APP_PUBLIC_URL` (or `FRONTEND_URL`) to the public frontend origin so emailed
verification links point to the deployed app. Keep all SMTP values in the
deployment secret store or an ignored local environment file. Without SMTP,
student, teacher, and security accounts remain pending until email verification
is completed and an admin activates them. Parent accounts activate after their
email is verified and the campus parent email plus roll number match.

### Parent portal access

- Open `http://localhost:3000/parent/register`, or use the **Parent portal
  access** link on sign-in.
- Register with the email stored in the student's campus record and that
  student's roll number. Parent access is created only after both match.
- With SMTP configured, follow the email verification link. For local-only
  development, `NEXUS_DEMO_MODE=true` exposes a verification link in the
  registration response when `NODE_ENV` is not `production`; never enable this
  mode in production.
- Then open `/login`, select **Parent**, and sign in. Parent notices and linked
  students appear in the Parent Portal; gatepass decisions are submitted there.
  Email is a prompt to visit the portal and never approves a request.

### Local demo database

The seed script connects to the configured `MONGO_URI` but always selects the
separate `nexus_demo` database. It upserts clearly fictional accounts, two
batches, subjects, sample parent notices, reviewable gatepasses, and timetable
entries without dropping other databases. To run the app against it, pass these
environment variables to the backend process:

```powershell
$env:MONGO_DB_NAME = "nexus_demo"
$env:NEXUS_DEMO_MODE = "true"
npm run dev
```

Prefer `npm run demo` when you want to guarantee the isolated database even if
an environment file overrides `MONGO_DB_NAME`.

`GET /health` reports the active database name. The seeded account list and
passwords are in `demo-files/NEXUS-Demo-Credentials-and-Timetable.xlsx`. A
re-seed rotates the demo passwords; regenerate the workbook from that seed run
before sharing credentials again. `node scripts/verifyDemo.js` checks the app
against the workbook, including all login rows and the parent/QR workflow. It
targets `127.0.0.1:5000` by default; set `NEXUS_API_PORT` to another local port
when verifying an isolated backend instance.

## Production deployment checklist

Use `backend/.env.example` and `frontend/.env.production.example` as variable
references only; they contain placeholders, not deployable credentials.

- Set `NODE_ENV=production`, `MONGO_URI`, `MONGO_DB_NAME`, and a unique
  `JWT_SECRET` of at least 32 bytes through the hosting platform's secret
  manager. Give the app a least-privilege database user and restrict MongoDB
  network access to the application environment.
- Bind the API to loopback by default for local runs. Set `HOST=0.0.0.0` only
  when the deployment platform's ingress must reach the container directly.
- Set `CORS_ORIGINS` to a comma-separated list of exact HTTPS frontend origins.
  Do not use `*`, paths, or HTTP origins. The API refuses to start in production
  when the allowlist is missing or invalid. CORS is not an authentication
  control; every protected API request still requires its role-authorized JWT.
- Enforce HTTPS at the public ingress/reverse proxy. Browser camera access
  requires a secure context (HTTPS in deployment; localhost is allowed for
  local testing). Configure proxy trust only to match the actual deployment
  topology before exposing IP-based rate-limited endpoints.
- Build the frontend with `REACT_APP_API_URL=https://<api-host>/api` when the
  API uses a separate origin. For a same-origin deployment, route `/api` to the
  backend and leave that variable unset; production builds default to `/api`,
  never `localhost`.
- Keep `NEXUS_DEMO_MODE` disabled. Configure `FRONTEND_URL` and
  `APP_PUBLIC_URL` to the public frontend origin. If email verification is
  required, provide the institutional SMTP host, port, sender, and credentials
  in the secret store, then verify delivery and link routing with a test
  account.
- Enable provider-managed encrypted MongoDB backups with a documented
  retention policy. Test restoring a backup into a non-production database
  before launch and record the recovery procedure and responsible operator.
- Monitor `/health`, application startup failures, database connectivity,
  email delivery, and scan/audit failures. Route application logs to the
  institution's monitoring system without logging passwords, bearer tokens,
  QR tokens, or SMTP credentials.
- Before launch, smoke-test login for each role, registration/email
  verification, parent decisions, gatepass issue/verify/exit/return and replay
  rejection, administrative changes, and mobile camera permission/scanning.
  Validate the final flows on the actual institutional origins and supported
  phone/browser combinations.

No institutional hostnames, SMTP relay, database target, backup service, or
monitoring destination is configured in this repository. A successful local
build is not production deployment acceptance.

## Signup and registration API

- `GET /api/auth/batch-options` returns `{ "batches": [{ "id", "name",
  "startYear", "endYear" }] }` for signup.
- `POST /api/auth/register` accepts roles `student`, `teacher`, or `security`.
  It responds with HTTP 202 and `{ "message", "accountStatus": "pending",
  "requiresEmailVerification": true, "verificationEmailSent": true|false }`.
  A false delivery flag is surfaced to the applicant; the account remains
  pending and cannot be activated until its email is verified. Registration
  never creates admins.
- `POST /api/auth/verify-email` accepts `{ "token": "..." }`; verification
  leaves accounts pending until an administrator activates them.
- `POST /api/auth/resend-verification` accepts `{ "email": "..." }` and
  sends a fresh link for an eligible pending account. Responses do not disclose
  whether an account exists; unavailable email delivery returns HTTP 503.
- Student registration requires a student registration code. Teacher and
  security registration require an admin-created one-use invitation. All
  account types require email verification and admin activation before login.
  Login role is determined by the stored account model; pending and disabled
  accounts are rejected. Existing records without a status remain active.

All `/api/registration` routes require an admin JWT:

- `POST /student-codes` accepts `{ "type": "individual"|"batch", "batch":
  "<batch-id>", "rollNo": "<roll-number>", "maxRedemptions": 1,
  "expiresAt": "<ISO date>" }`. `rollNo` is required for individual codes;
  batch-code `maxRedemptions` defaults to 1. Response: `{ "message", "code",
  "registrationCode": { "id", "type", "batch", "rollNo", "maxRedemptions",
  "redemptionCount", "expiresAt" } }`. The generated code is returned once so
  an administrator can distribute it; only its hash is stored.
- `GET /student-codes` returns `{ "codes": [...] }` with code metadata and no
  code hashes or raw codes.
- `PATCH /student-codes/:id/revoke` returns `{ "message",
  "registrationCode": { ...metadata } }`.
- `POST /invitations` accepts `{ "role": "teacher"|"security", "email":
  "<optional invited address>", "expiresAt": "<optional ISO date>" }`.
  Response: `{ "message", "invitationCode", "invitation": { "id", "role",
  "email", "expiresAt" } }`. The one-use invitation token is shown only on
  creation; only its hash is stored.
- `GET /invitations` returns invitation metadata only; invitation hashes and
  tokens are never returned.
- `PATCH /invitations/:id/revoke` revokes an unused invitation.
- `GET /pending-accounts` returns `{ "accounts": [{ "id", "role", "name",
  "email", "emailVerified", "createdAt" }] }`.
- `POST /pending-accounts/:role/:id/approve` activates only verified pending
  accounts and returns `{ "message", "account": { "id", "name", "email",
  "accountStatus", "emailVerified" } }`.

Signup and email-verification requests have per-IP rate limits. Student codes
are eligibility-only and are atomically redeemed subject to expiry, revocation,
batch, and redemption limits.

`GET /api/security/profile` requires a security-personnel token and returns
only that account's workspace profile fields.

## Parent portal

- `POST /api/parent/register` accepts `{ "name", "email", "rollNo",
  "password", "confirmPassword" }`. The email and roll number must match an
  active student record's parent email and roll number. The account remains
  pending until the parent verifies the email link. The response reports
  `verificationEmailSent`; delivery is optional and uses the configured SMTP
  relay above.
- Parent sign-in uses `POST /api/auth/login`; the server derives the `parent`
  role from the stored account.
- `GET /api/parent/me` returns the authenticated parent's linked students,
  campus notifications, and gatepass status summaries. It does not accept a
  client-supplied parent or student ID.
- `POST /api/parent/link-student` accepts `{ "rollNo" }` for an additional
  child only when that student's campus record contains the authenticated,
  verified parent email.
- `PATCH /api/parent/notifications/:id/read` updates only a notification owned
  by the authenticated parent.
- `GET /api/gatepass/parent/pending` lists only teacher-approved requests for
  the authenticated parent's linked students.
- `PUT /api/gatepass/parent/:id/decision` accepts `{ "decision":
  "approved"|"rejected" }`. It records one decision only for an eligible linked
  student request. Teacher approval moves a new request to `parent_pending` and
  requires an active, email-verified parent account first.

Gatepass and low-attendance events create in-app parent notices only for active,
email-verified parent accounts linked to the student. If SMTP is configured,
NEXUS sends a sign-in prompt and records `emailStatus`, which the parent can see
in the portal. The email never approves or rejects a request. Decisions are
accepted only in the authenticated portal and are stored on the gatepass record.

Run backend security and registration tests from `backend/` with:

```sh
node --test test/*.test.js
```
