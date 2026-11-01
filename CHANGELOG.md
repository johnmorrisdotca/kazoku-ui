# Changelog

## [0.1.0] - 2026-11-01

The first release, and its first part: view controls, at `@johnmorrisdotca/kazoku-ui/view-controls`.

- `<kazoku-view-controls>`, a framework-free custom element (`/view-controls/element`, registered by `/view-controls/define`, which leaves a tag already taken alone), and `createViewController`, the same hands without an element.
- Angle and tilt sliders, Auto-turn with play and pause, Front; zoom out, 2 times, in and Fit; zoom about the pointer and with Ctrl or Command and the wheel; the four-arrow pan pad and the Move or Turn choice for a drag.
- Touch: one finger turns at 1x and moves the view when zoomed in; two fingers pinch.
- Choices kept in the address, with keys you can rename (`parseAddress`, `formatAddress`).
- It never draws: it reports `{ yaw, tilt, zoom, panX, panY, turning, drag }` in a `kazoku-viewchange` event or an `onChange` callback.
- Labels in English and Japanese; light and dark; 48 px touch targets; a compact bar on a phone; no automatic turn for a reader who prefers reduced motion.
- No runtime dependencies.
