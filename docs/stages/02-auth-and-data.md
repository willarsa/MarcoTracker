# Stage 2: Friend Sign-In And Shared Data

## Goal

Replace local prototype identity and progress with a lightweight shared backend so every friend's phone reads the same shirt standards and leaderboard.

## Current Implementation

The app now has a no-dependency Node backend. It stores users, hashed passwords, sessions, unlocks, scan events, and leaderboard data in `data/db.json`. This proves the sign-in flow and per-user leaderboard shape before moving to hosted storage.

## Build Scope

- Replace the local JSON backend with a hosted database suitable for a small friend group.
- Keep the username and password flow or swap to passcodes/magic links.
- Create user records, unlock records, and scan event records.
- Create shared shirt style records for the eight canonical color standards.
- Migrate `data/db.json` records into hosted storage when deployment begins.

## Suggested Data Model

- `users`: id, display name, access code hash or auth provider id, created date, last active date.
- `shirt_styles`: id from 1 to 8, name, canonical color values, tolerance settings, status, first scanner user id, created date.
- `unlocks`: user id, shirt style id, scan event id, unlocked date.
- `scan_events`: user id, sampled color values, matched style id, confidence, device hints, created date.

## Acceptance Criteria

- Progress persists across devices after sign-in.
- Leaderboard reflects shared records.
- A user cannot overwrite another user's progress accidentally.
- Shirt standards are global records rather than local constants.

## Notes For Stage 3

The scanner should write scan events through a single API path so color matching rules can be audited and adjusted.
