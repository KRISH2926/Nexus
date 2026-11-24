# NEXUS Frontend Redesign — Connected Motion

**Status:** Implemented and ready for user review (2026-11-24)  
**Scope:** Public landing page redesign, retaining the role-workspace preview and existing destinations. No backend code was changed as part of this redesign.

This replaces the previous landing-page direction. The low-poly Three.js campus and its fallback were removed. The visual identity now uses a readable particle wordmark, a light flowing grid, connected interface fragments, and editorial typography.

## Brand and typography

- **Hero:** “Everything on campus. Finally, in sync.”
- **Display:** Cabinet Grotesk Variable.
- **Body/UI:** Switzer Variable.
- Both self-hosted fonts and their Fontshare ITF Free Font License notice are in `frontend/public/fonts/`.
- The existing Motion library handles React transitions. Custom Canvas 2D and CSS handle the network, grid, and button response; no paid or copied component source is used.

## Page structure

1. Responsive navigation with the NEXUS mark, sign-in/sign-up actions, and a keyboard-operable mobile menu.
2. Particle identity hero with orbiting campus icons, campus-area chips, concise copy, and two calls to action.
3. Campus-process problem statement with disconnected details resolving into one connected point.
4. Four platform module cards for academics, people and administration, campus operations, and communication.
5. Interactive role previews for students, teachers, administrators, and campus security. The interface compositions are illustrative, not represented as screenshots.
6. Four-step gatepass journey through student, teacher, parent portal, and security, with an illustrative one-time pass and an explicit portal-approval/notification distinction.
7. Accountability diagram for access, registration, approvals, QR passes, exit/return records, and audit history.
8. Accessible FAQ accordion with six product questions.
9. Closing CTA and compact footer.

## Motion, accessibility, and responsive behavior

- The particle canvas limits density by viewport size, stops while the document is hidden, cleans up on unmount, and draws a static state for reduced motion.
- Motion is concentrated in the hero canvas and small interface transitions; the content follows normal page scrolling, with compact responsive layouts on mobile.
- The mobile menu closes on Escape or link selection and returns focus to its toggle. Navigation destinations account for the sticky header.
- Interactive targets on mobile meet a 44px minimum height; focus indicators are visible.
- Landing-specific typography and styles are scoped so other application routes retain their own styling.

## Validation

- `npm run build` succeeds.
- `CI=true npm test -- --watchAll=false` passes: 9 suites and 22 tests.
- Browser-tested at 320, 375, 768, 1024, and 1440 CSS pixels with no horizontal overflow.
- Verified role-preview selection, mobile menu open/close, and reduced-motion canvas rendering.
- No browser page errors were observed. Tests still print the existing non-fatal React Router future-flag warnings.

The frontend build also reports stale Browserslist data; the existing dependency audit advisories were not force-upgraded as part of this visual redesign.

## Following workspace phase

The security workspace renders its verified profile from `/api/security/profile`, with explicit loading, retry, and error states. Gatepass scanning and exit/return workflows are implemented; physical camera verification on a supported phone remains open.
