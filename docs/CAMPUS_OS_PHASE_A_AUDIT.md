# NEXUS Campus OS — Phase A Audit

## Preservation snapshot

- Development branch: `nexus-campus-os`.
- Pre-redesign snapshot: `D:\Nexus_ERP\NEXUS_backup_20261124` (includes Git metadata and installed dependencies).
- The starting worktree contained uncommitted changes, including timetable and assignment work. These were retained and copied into the backup; they must be preserved while later phases are integrated.
- Existing application stack remains React 18/Create React App, Express, Mongoose/MongoDB, and JWT. No framework migration is planned.

## Existing feature map

| Existing feature | Current implementation | Campus OS destination |
|---|---|---|
| Student login/dashboard | Login, attendance summaries, timetable, notifications, assignments, basic gatepass requests | Student — My Campus |
| Teacher/mentor workspace | Shared dashboard for attendance, students, subjects, assignments, timetable, and mentor gatepass decisions | Teacher — Faculty Workspace |
| Admin workspace | Student, teacher, batch, and subject management; timetable CRUD/import | Admin — Campus Command Centre |
| Attendance | Single/bulk marking, monthly views, low-attendance reports/notifications | Student academics, teacher workspace, admin reports |
| Assignments/submissions | Create, list, submit, and results | Student and teacher workspaces |
| Gatepass | Student request and mentor approve/reject only | Expanded teacher/parent/security workflow |
| Notifications | Student in-app attendance notifications | Shared role-aware notification center |
| Batches and subjects | Basic create/list and teacher assignment | Admin management and authorization relationships |
| Timetable | Weekly entries, import, teacher/student today views | Shared academic experience and admin management |
| Public, parent, security, registration | No corresponding pages or complete backend workflows found | New public site, parent portal, security workspace, verified signup |

The existing API is mounted under `/api`. Established paths include `/auth/login`, `/student/*`, `/teacher/*`, `/batch/*`, `/subject/*`, `/attendance/*`, `/assignment/*`, `/gatepass/*`, `/notification/*`, and `/timetable/*`. Existing consumers should be migrated before any route is removed. Assignment and timetable work in the starting worktree is included in this preservation baseline.

## Data and relationship baseline

- `Student -> Batch`; `Teacher -> Batch`; `Subject -> Batch, Teacher`.
- `Attendance -> Student, Batch, Subject`.
- `Gatepass -> Student, Teacher (mentor)`.
- `Notification -> Student, Subject`.
- `Timetable -> Batch, Teacher, Subject`.
- `Assignment -> Teacher, Subject, Batch`; `Submission -> Assignment, Student`.
- `Admin` is separate from student and teacher records. There is no shared account identity, parent, security-personnel, gate, exit-log, policy, push-subscription, registration-code, or audit-log model.

### Required additive data changes

1. Keep the existing student, teacher, batch, subject, attendance, assignment, submission, and timetable collections as the source of existing data; do not create duplicate student/teacher records.
2. Add verified parent identities and explicit parent-student links. Support multiple linked students without allowing arbitrary self-linking.
3. Add security personnel, assigned gates/shifts, gate records, and append-only exit/re-entry scan logs.
4. Add hashed, expiring, revocable individual/batch registration codes with redemption history and atomic redemption limits.
5. Extend gatepass requests with requested/expected times, explicit approval records, QR-token hash, issuance/expiry, quota reservation, and campus-presence state. Store raw QR/approval tokens only transiently, never in MongoDB.
6. Add effective-dated quota/policy records, notification delivery/subscription state, verification/invitation records, and audit events.
7. Add indexes and transaction/atomic-update rules for code redemption, quota reservation, one submission per assignment/student, attendance duplicates, gatepass state transitions, and one-time exit scans. Confirm MongoDB transaction support in each deployment before requiring multi-document transactions.

Legacy gatepasses need an explicit migration policy. Existing `pending` requests can map to `pending_teacher`; `rejected` remains closed. A legacy `approved` request does not prove parent approval or QR issuance and must not become exit-eligible automatically. Preserve its history and require an authorized migration/review decision rather than manufacturing approvals.

## Required API evolution

- Keep current endpoint paths and response shapes available while existing pages are migrated. Prefer additive versioned workflows or compatible extensions; remove an old path only after all frontend consumers and integrations have moved.
- Add role-safe signup, verification, invitations, registration-code administration/redemption, roster import, parent onboarding/linkage, parent decisions/history, security personnel/gate/shift administration, policy/quota management, and audit/report APIs.
- Expand gatepass APIs into request, teacher decision, parent decision, issuance/revocation, QR verification, confirmed exit, and return operations. Each transition must be checked server-side and recorded; notifications do not authorize a transition.
- Add paginated/filterable admin reports and minimal-data scan responses. Scope all lookups to authenticated relationships rather than client-supplied role or owner IDs.
- Add push-subscription registration and notification-delivery tracking; institutional SMTP is optional configuration, and the portal/in-app workflow must remain functional without it.

## Frontend baseline and integration constraints

- The root path currently renders login, not a public homepage. The three current portals are separate pages; `/teacher` and `/mentor` share one dashboard. No parent, security, signup, or route-level authentication shell exists.
- API calls mix direct `fetch` and Axios and commonly embed `http://localhost:5000`. Consolidate configuration/authenticated requests while preserving the existing API contracts during migration.
- Existing role pages and timetable/assignment screens are the production baseline, not placeholders to discard.
- The VengeanceUI repository currently declares MIT at repository level. Its current main package is a Next.js/React 19 monorepo, whereas this application is React 18/CRA. The public landing page uses adapted Animated Button and FAQ Accordion sources with the upstream MIT notice retained; it does not install the full package or migrate frameworks.
- The existing React build succeeds. The frontend Jest test originally could not start because its setup dependencies were missing, and its assertion expected Create React App's “learn react” text even though `/` renders the login page. The assertion now targets the actual login screen, and the missing test-only dependencies have been added. Backend focused security tests pass, but there is no domain regression suite yet.
- Installing those test dependencies reported 55 npm advisories (including 3 critical) in the frontend dependency graph. This requires dependency-by-dependency triage; do not apply a blanket force-upgrade that could break CRA or React 18.
- Timetable import can create related entities before all validation completes and can replace a schedule; it needs scoped/atomic or reversible semantics before being reused for roster imports.

## Phase gates and outstanding scope

Phase A is complete when this audit, preservation backup, and branch are recorded. Subsequent implementation remains phased: public site/design; secure registration; role workspaces and ERP migration; parent workflow; gatepass state machine; security scanning; admin policy/reporting; then integrated quality and deployment work. This audit is not a claim that those product features are implemented.
