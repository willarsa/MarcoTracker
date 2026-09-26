# Stage 6: QA, Deploy, And Operations

## Goal

Prepare Marco Tracker for real friend-group use on phones.

## Build Scope

- Test on iOS Safari and Android Chrome.
- Verify camera permission, torch fallback, and low-light states.
- Add basic rate limits for scan submissions.
- Add lightweight admin tools for correcting accidental standards or unlocks.
- Deploy over HTTPS because camera access requires a secure context on phones.
- Document backup and reset procedures for the shared data.

## Acceptance Criteria

- The scanner works on at least one target phone with HTTPS.
- Users can recover from denied camera permissions.
- Bad scan data can be corrected by an admin.
- The app can be reset for a fresh Marco season without code changes.

## Risks

- Browser camera and torch support can differ across phones.
- Fabric texture, shadows, and camera auto-white-balance can shift colors.
- The app needs a human correction path because color matching will never be perfect.
