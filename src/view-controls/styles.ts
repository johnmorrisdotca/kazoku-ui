// The element's styles. Colours are custom properties on the host, so a page can set its own:
// --kazoku-ink, --kazoku-surface, --kazoku-line, --kazoku-accent. Light and dark follow the page's colour scheme unless `theme="light"` or `theme="dark"` is set.
export const STYLES = `
:host {
  --_ink: var(--kazoku-ink, #1b1b1f);
  --_surface: var(--kazoku-surface, #ffffff);
  --_line: var(--kazoku-line, #c9ccd3);
  --_accent: var(--kazoku-accent, #2457d6);
  display: block;
  box-sizing: border-box;
  color: var(--_ink);
  font: 600 0.9rem/1.2 system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", "Segoe UI", sans-serif;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :host(:not([theme="light"])) {
    --_ink: var(--kazoku-ink, #f1f2f6);
    --_surface: var(--kazoku-surface, #1c1d22);
    --_line: var(--kazoku-line, #4a4d58);
    --_accent: var(--kazoku-accent, #8fb0ff);
  }
}
:host([theme="dark"]) {
  --_ink: var(--kazoku-ink, #f1f2f6);
  --_surface: var(--kazoku-surface, #1c1d22);
  --_line: var(--kazoku-line, #4a4d58);
  --_accent: var(--kazoku-accent, #8fb0ff);
  color-scheme: dark;
}
:host([theme="light"]) { color-scheme: light; }
:host([overlay]) { position: absolute; inset-inline: 0; bottom: 0; z-index: 1; }
:host([overlay]) .bar { background: color-mix(in srgb, var(--_surface) 88%, transparent); }
[hidden] { display: none !important; }
.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 4px 8px; box-sizing: border-box; }
.field { display: flex; align-items: center; gap: 8px; flex: 1 1 200px; min-width: 0; }
.field.tilt { flex-basis: 150px; }
.field label { flex: none; }
.field output { flex: none; min-width: 3.2em; text-align: end; font-variant-numeric: tabular-nums; }
.group { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
input[type="range"] { -webkit-appearance: none; appearance: none; flex: 1 1 auto; width: 100%; min-width: 60px; height: 48px; margin: 0; padding: 0; background: transparent; cursor: pointer; }
input[type="range"]::-webkit-slider-runnable-track { height: 6px; border-radius: 3px; background: var(--_line); }
input[type="range"]::-moz-range-track { height: 6px; border-radius: 3px; background: var(--_line); }
input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 28px; height: 28px; margin-top: -11px; border-radius: 50%; background: var(--_accent); border: 3px solid var(--_surface); box-shadow: 0 0 0 1px var(--_ink); }
input[type="range"]::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: var(--_accent); border: 3px solid var(--_surface); box-shadow: 0 0 0 1px var(--_ink); }
input[type="range"]:focus-visible { outline: 2px solid var(--_ink); outline-offset: -4px; border-radius: 8px; }
button { -webkit-appearance: none; appearance: none; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 48px; min-height: 48px; margin: 0; padding: 0 14px; border: 1px solid var(--_line); border-radius: 24px; background: var(--_surface); color: var(--_ink); font: inherit; cursor: pointer; white-space: nowrap; }
button:hover:not(:disabled) { border-color: var(--_ink); }
button:focus-visible { outline: 2px solid var(--_ink); outline-offset: 2px; }
button[aria-pressed="true"] { background: var(--_ink); color: var(--_surface); border-color: var(--_ink); }
button[aria-expanded="true"] { border-color: var(--_ink); box-shadow: inset 0 0 0 1px var(--_ink); }
button:disabled { opacity: 0.4; cursor: default; }
svg { width: 18px; height: 18px; fill: currentColor; flex: none; }
button[aria-pressed="true"] .i-play, button[aria-pressed="false"] .i-pause { display: none; }
.zoom button.two { min-width: 56px; }
.zoom button.level { min-width: 64px; padding: 0 8px; font-variant-numeric: tabular-nums; }
.pace .lbl { margin-inline-end: 4px; }
.drag { margin-inline-start: 8px; }
.more { margin-inline-start: auto; }
/* A compact bar on a phone: two rows to start with (angle, Auto-turn and More; the zoom), more rows when the reader asks for more; labels read only by a screen reader. */
@media (max-width: 640px) {
  .bar { display: grid; grid-template-columns: minmax(0, 1fr) 48px 48px; grid-template-areas: "angle play more" "tilt tilt front" "pace pace pace" "zoom zoom zoom" "pan pan pan"; gap: 0 8px; padding: 2px 8px; }
  .field.angle { grid-area: angle; }
  .field.tilt { grid-area: tilt; }
  .field label, .field output, .play .text, .more .text, .pace .lbl { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .play, .more { padding: 0; }
  .play { grid-area: play; }
  .more { grid-area: more; }
  .front { grid-area: front; padding: 0 12px; }
  .pace { grid-area: pace; justify-self: end; flex-wrap: nowrap; }
  .pace button { padding: 0 12px; }
  .zoom { grid-area: zoom; justify-self: end; flex-wrap: nowrap; }
  .zoom button { padding: 0 8px; }
  .zoom button.level { padding: 0 6px; }
  .pan { grid-area: pan; justify-content: center; }
  .drag { margin-inline-start: 4px; }
}
`;
