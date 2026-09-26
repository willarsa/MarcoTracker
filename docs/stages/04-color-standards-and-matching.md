# Stage 4: Color Standards And Matching

## Goal

Turn camera frames into reliable shirt color matches with enough margin of error for different phones, rooms, and lighting.

## Build Scope

- Sample the central shirt region from the captured frame.
- Reject frames that are too dark, too bright, blurry, or dominated by skin/background colors.
- Convert sampled colors into a perceptual color space before comparison.
- Compare scans against canonical style colors using a tolerance threshold.
- Allow the first distinct scan for a new style to establish that shared standard.
- Prevent near-duplicate standards by requiring a minimum distance from existing styles.

## Acceptance Criteria

- Existing standards match when the sampled color is within tolerance.
- Scans that are too close to an existing standard do not create a new style.
- Scans that are far enough from every existing standard can establish the next style until all eight exist.
- Every decision stores confidence and sampled color values for later review.

## Notes For Tuning

Start with conservative tolerance values and log false positives. It is better for a friend to rescan than to unlock the wrong shirt.
