# Stage 3: Camera Scanner And Torch

## Goal

Use the phone camera to capture Marco's shirt under consistent lighting, preferring the rear camera and enabling the torch when the browser and device support it.

## Current Implementation

The scanner now starts a rear-camera preview, attempts to enable torch support, captures the center of the video frame, averages the sampled RGB values, and submits the sample to the backend for matching and unlocks.

## Build Scope

- Improve the capture guidance once testing on real phones shows how much framing help is needed.
- Add HTTPS hosting before scanning from another phone on the network.
- Add richer rejected-frame feedback for low light and bad centering.

## Acceptance Criteria

- On supported phones, camera preview starts from the rear camera.
- Torch is enabled automatically when supported.
- The app still works when torch is unavailable by showing a stable fallback state.
- Captured frame data can be passed to Stage 4 color extraction.

## Notes

Browser torch support varies by platform and device. The implementation must feature-detect track capabilities instead of assuming support.
