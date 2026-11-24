# NEXUS Campus OS — Phase J Status

Phase J is in progress. Local readiness work and automated checks pass, but
physical-device and institutional deployment acceptance are not claimed.

## Completed in this environment

- Local API connected to MongoDB and reported `nexus_demo` while started with
  `node server.js --demo`.
- Demo verifier passed all 108 workbook account logins, parent signup and
  verification, portal access, timetable data, admin reports, security gate/shift
  staffing, and QR exit/return/replay behavior.
- Backend: `node --test` — 25 tests passed.
- Frontend: `CI=true npm test -- --runInBand` — 10 suites and 30 tests passed.
- Frontend: `npm run build` — optimized production build compiled.
- Current React app served the login, parent registration, and admin campus-gate
  routes. Parent registration was visually inspected at a 375×812 viewport.
- Backend CORS now requires an explicit HTTPS origin allowlist in production;
  startup fails closed if it is absent or invalid. Development permits loopback
  origins only by default.
- The backend now binds to loopback by default; container deployments must set
  `HOST=0.0.0.0` only when required by their ingress.
- Frontend API URLs are centralized. Development defaults to localhost; a
  production build defaults to same-origin `/api` and accepts only a same-origin
  path or HTTPS URL when `REACT_APP_API_URL` is set.
- QR camera fallback, permission denial, stopping a pending camera request, and
  keeping a successful gate action visible when activity refresh fails are
  covered by frontend tests. The scanner throttles decode attempts and reports
  decoder failures.
- Local browser accessibility smoke check found one main landmark and one H1,
  no images missing alt text, and no unnamed links, buttons, or form controls
  on the public landing page. Responsive overflow was checked from 320 to
  1440 CSS pixels.
- Local API health returned HTTP 200. This is a local smoke check, not a
  production performance or availability measurement.
- The currently running API on port 5000 reports `nexus_demo`; the demo
  verifier passed against it and an isolated loopback API on port 5001. The
  public landing page rendered;
  unauthenticated direct access to `/admin` correctly redirected to `/login`.
  Authenticated admin UI interaction was not browser-verified.

## Remaining acceptance work

- Verify camera permission and QR scanning on supported physical mobile devices.
  This needs a real device and a user-approved camera permission prompt.
- Complete a broader WCAG/accessibility audit and performance profiling across
  authenticated role workspaces and target devices, including screen readers
  and production-like mobile hardware.
- Validate deployment with the institution's actual MongoDB, HTTPS origin,
  CORS allowlist, SMTP relay, secrets store, backup/restore plan, and monitoring.
  No production deployment target or institutional credentials were provided.
- Confirm reverse-proxy topology and configure Express proxy trust accordingly
  before exposing IP-based rate-limited endpoints.

## Local run

- Backend demo: from `backend/`, run `npm run demo`; health is at
  `http://localhost:5000/health`.
- Frontend: from `frontend/`, run `npm start`. If port 3000 is occupied by a
  server that does not serve SPA routes, start with `PORT=3001` (PowerShell:
  `$env:PORT='3001'; npm start`).
- Demo credentials are in `demo-files/NEXUS-Demo-Credentials-and-Timetable.xlsx`.
  They are fictional local-only accounts; re-seeding rotates their passwords.

React Router v7 future-flag notices, CRA webpack middleware deprecation
notices, and stale Browserslist metadata are non-fatal. Dependency upgrades were
not applied as part of this acceptance pass.
