# Stage 1: Product Shell And Local Prototype

## Goal

Create the first usable version of Marco Tracker without requiring a backend. This stage should prove the main screens and interaction model on a phone-sized viewport.

## Build Scope

- Static app entry point with HTML, CSS, and JavaScript.
- Home screen with the supplied shirt image filled by unlocked color lines.
- Opening auth gate so users sign in before seeing the tracker.
- Collection screen showing eight shirt slots, with locked and unlocked states.
- Scanner screen placeholder that explains the future camera flow and includes a simulated unlock control for prototype testing.
- Leaderboard screen populated from local prototype data.
- Responsive layout for phone and desktop.

## Data Rules

- Store only prototype data in `localStorage`.
- Seed eight placeholder shirt colors that are visually distinct.
- Treat simulated unlocks as local-only progress.
- Make any visible prototype state easy to replace with shared backend data in Stage 2.

## Acceptance Criteria

- Opening `index.html` shows the app immediately.
- A user can enter a name and see progress saved after refresh.
- The progress shirt fills one line at a time as local slots are unlocked.
- Collection and leaderboard views are reachable without page reloads.
- The UI makes the scanner the central action while making clear that real camera scanning is a later stage.

## Out Of Scope

- Real authentication.
- Real camera access.
- Shared standards across phones.
- Server persistence.
