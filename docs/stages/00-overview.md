# Marco Tracker Build Overview

Marco Tracker lets friends sign in, scan Marco's shirt color with a phone camera, and unlock one of eight shared shirt styles. The app should feel like a small collection game: quick to open, obvious to scan, and fun to compare on a leaderboard.

## Product Rules

- There are eight shirt styles total.
- The first sufficiently distinct scan for a style becomes the shared standard color for that style.
- Future scans match against shared standard colors with a tolerance margin.
- Phone scanning should request the rear camera and try to enable the torch for consistent lighting.
- Every user has their own unlock progress.
- Leaderboard rank is based on completed unlock count, then recent scan activity.
- Security can stay light because the app is for friends, but user identity and shared standards must not depend on one device's local storage in the finished app.

## Stages

1. Product shell and local prototype.
2. Friend sign-in and shared data model.
3. Camera scanner and torch control.
4. Color extraction, calibration, and matching.
5. Collection, leaderboard, and unlock workflows.
6. QA, deployment, and operating notes.

Each stage has its own instruction file with scope, files to touch, acceptance criteria, and notes for the following stage.
