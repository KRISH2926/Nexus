# NEXUS Campus OS — Phase F Closeout

Phase F implements parent registration, verified parent/student linking,
parent portal notices, and in-portal gatepass decisions.

## Parent onboarding

- Registration is available at `/parent/register` and from the sign-in page.
- The backend verifies the submitted parent email against an active student
  record's `parentEmail` and the supplied roll number.
- Parent passwords are hashed. New accounts remain pending until the email
  verification token is used. Verification activates the parent and links only
  that eligible student.
- In local development only, `NEXUS_DEMO_MODE=true` returns a local verification
  link if SMTP is not configured. The response never includes this link when
  `NODE_ENV=production`.
- Parents sign in by selecting the Parent role. Their portal lists linked
  students, notices, gatepass requests, and recorded decisions.

## Notices and decisions

- Parent notices are stored in-app and scoped to the parent account.
- Email delivery is attempted only when institutional SMTP is configured; the
  email prompts the parent to sign in and cannot approve or reject a request.
- A parent decision checks the authenticated parent, linked student, exact
  request, and pending state, then stores the decision and timestamp.
- Notification read state is parent-scoped.

## Verification

- Backend suite: `node --test test/*.test.js` — 22 tests passed.
- Frontend suite: `npm test -- --watchAll=false --runInBand --silent` — 8 suites,
  17 tests passed.
- Frontend production build: `npm run build` — compiled successfully.
- Live verification included signup, local verification, login, and access to
  the linked student workspace.

Parent messages are available after a parent signs in at `/login` with the
Parent role. Demo parent credentials are in the `Parents` sheet of the local
demo workbook.
