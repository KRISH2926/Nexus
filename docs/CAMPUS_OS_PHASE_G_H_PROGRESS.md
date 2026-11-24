# NEXUS Campus OS — Phases G and H Progress

Phases G and H now have an integrated server-side pass lifecycle and usable
student, parent, admin, and security controls.

## Implemented

- Student requests include a reason, date, exit time, expected return time, and
  optional details; the server checks active accounts, date range, time order,
  assigned mentor, and same-day duplicates.
- The flow is student request → assigned teacher → linked, verified parent →
  student-issued QR pass.
- QR tokens are random and stored as SHA-256 hashes. Issuance requires both
  approvals, charges the monthly quota atomically, and applies an expiry.
- The default quota is two issued passes per calendar month, with global,
  batch, and student overrides. Admin changes require a reason and are audited.
- Security can scan with `BarcodeDetector` where the browser supports it, or
  enter a connected scanner's token. The API verifies status/expiry, limits the
  exit and return to one successful record each, and stores security, gate,
  timestamp, and scan reference. Security views expose only the student fields
  needed for gate verification.
- Admin reports include request status counts, quota use, recent scan activity,
  audit history, security gate assignment, and unused pass revocation.
- A five-minute backend sweep expires unissued requests and stale QR passes;
  used records are retained.

## Live verification performed

`node scripts/verifyDemo.js` authenticated all 108 accounts from the workbook,
loaded both timetable batches, exercised parent signup and verification,
approved a sample request, issued a QR token, recorded exit and return, and
confirmed a replayed return is rejected. The backend `/health` endpoint
confirmed the active database is `nexus_demo`.

## Remaining before Phase J acceptance

- Verify camera permission and scanning on supported physical mobile browsers;
  scanner-token API lifecycle is covered, but no camera permission was granted
  during this run.
- Complete broader browser accessibility, responsive, performance, and
  deployment checks.
- Phase I gate/shift management and roster audit coverage are complete; see
  `CAMPUS_OS_PHASE_I_CLOSEOUT.md`.
