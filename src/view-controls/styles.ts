// The element's styles. Colours are custom properties on the host, so a page can set its own:
// --kazoku-ink, --kazoku-surface, --kazoku-line, --kazoku-accent. Light and dark follow the page's colour scheme unless `theme="light"` or `theme="dark"` is set.
const CLASSIC = ':host([data-layout="classic"])';
const H = ':host([data-layout="horizontal"])';
const V = ':host([data-layout="vertical"])';
const C = ':host([data-layout="compact"])';
/** Read by a screen reader, not shown. */
const UNSEEN = "position: absolute; width: 1px; min-width: 0; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap;";

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
.zoom button.level { min-width: 64px; padding: 0 8px; font-variant-numeric: tabular-nums; }
/* The speed buttons are an element of their own: they are given the colours this bar has, set on the bar so that the buttons' own variables never read themselves. */
.bar { --_bar-ink: var(--_ink); --_bar-surface: var(--_surface); --_bar-line: var(--_line); --_bar-accent: var(--_accent); }
.pace { --kazoku-ink: var(--_bar-ink); --kazoku-surface: var(--_bar-surface); --kazoku-line: var(--_bar-line); --kazoku-accent: var(--_bar-accent); }
/* One small button: the word over the speed, so it takes little room. It comes in on Auto-turn's left, so Auto-turn stays under the pointer that just pressed it. The angle's running number makes the room, so the turning bar is never wider than the still one and adds no row; it stays for a screen reader. */
/* The speed buttons and the Left and Right buttons are one row (two when the room is short) and take the place the speed buttons had. */
.pacing { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px 12px; }
.dir button { padding: 0 12px; }
.pace-now { flex-direction: column; gap: 0; padding: 0 10px; line-height: 1.1; }
.pace-now .lbl { font-size: 0.7em; font-weight: 400; }
:host([data-turning][data-level="basic"]) .field.angle { flex-basis: 110px; }
:host([data-turning][data-level="basic"]) .field.angle output { position: absolute; width: 1px; min-width: 0; height: 1px; overflow: hidden; clip-path: inset(50%); }
.drag { margin-inline-start: 8px; }
.more { margin-inline-start: auto; }
/* The classic bar on a phone: two rows to start with (angle, Auto-turn and More; the zoom), more rows when the reader asks for more; labels read only by a screen reader. */
@media (max-width: 640px) {
  ${CLASSIC} .bar { display: grid; grid-template-columns: minmax(0, 1fr) 48px 48px; grid-template-areas: "angle play more" "tilt tilt front" "pace pace pace" "zoom zoom zoom" "pan pan pan"; gap: 0 8px; padding: 2px 8px; }
  ${CLASSIC} .field.angle { grid-area: angle; }
  ${CLASSIC} .field.tilt { grid-area: tilt; }
  ${CLASSIC} .field label, ${CLASSIC} .field output, ${CLASSIC} .play .text, ${CLASSIC} .more .text, ${CLASSIC} .pace::part(label) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  ${CLASSIC} .play, ${CLASSIC} .more { padding: 0; }
  ${CLASSIC} .play { grid-area: play; }
  ${CLASSIC} .more { grid-area: more; }
  ${CLASSIC} .front { grid-area: front; padding: 0 12px; }
  ${CLASSIC} .pacing { grid-area: pace; justify-self: end; }
  ${CLASSIC} .zoom { grid-area: zoom; justify-self: end; flex-wrap: nowrap; }
  ${CLASSIC} .zoom button { padding: 0 8px; }
  ${CLASSIC} .zoom button.level { padding: 0 6px; }
  /* In the free room left of the zoom buttons, so showing it adds no row. */
  ${CLASSIC} .pace-now { grid-area: zoom; justify-self: start; }
  ${CLASSIC} .pan { grid-area: pan; justify-content: center; }
  ${CLASSIC} .drag { margin-inline-start: 4px; }
}
/* In a panel narrower than the buttons and the speed need side by side, the speed takes the row under them. */
${CLASSIC} { container-type: inline-size; }
@container (max-width: 329px) {
  @media (max-width: 640px) {
    ${CLASSIC} .pace-now { grid-area: pace; justify-self: end; }
  }
}

/* The zoom slider (horizontal, vertical and compact): a logarithmic track with ticks at its marks, the labels under it, and the part from the least zoom to the zoom now filled. */
.zslide { display: none; }
${H} .zslide, ${V} .zslide, ${C} .zslide { display: flex; }
.zbox { position: relative; flex: 1 1 auto; min-width: 96px; height: 52px; }
.zbox input { position: absolute; inset: 0 0 auto; z-index: 1; min-width: 0; }
.zbox input::-webkit-slider-runnable-track { background: transparent; }
.zbox input::-moz-range-track { background: transparent; }
.ztrack { position: absolute; inset-inline: 14px; top: 21px; height: 6px; border-radius: 3px; background: var(--_line); }
.zfill { position: absolute; inset-block: 0; left: 0; width: calc(var(--pos, 0) * 100%); border-radius: 3px; background: var(--_accent); }
.ztick { position: absolute; top: 50%; left: calc(var(--at) * 100%); width: 2px; height: 14px; border-radius: 1px; background: var(--_ink); opacity: 0.5; transform: translate(-50%, -50%); }
.zmarks { position: absolute; inset-inline: 14px; top: 36px; height: 16px; pointer-events: none; }
.zmark { position: absolute; left: calc(var(--at) * 100%); transform: translateX(-50%); font-size: 0.72rem; font-weight: 500; line-height: 16px; opacity: 0.85; white-space: nowrap; font-variant-numeric: tabular-nums; }
.zmark[data-end="start"] { transform: translateX(-35%); }
.zmark[data-end="end"] { transform: translateX(-65%); }

/* Horizontal: a tidy bar under the view. Two rows (the turn, then the zoom with its slider); one row when its own width allows. More adds its rows between them. */
${H} { container-type: inline-size; }
${H} .bar, ${V} .bar, ${C} .bar { display: grid; row-gap: 0; align-items: center; }
${H} .bar > *, ${V} .bar > *, ${C} .zoom > * { margin-block: 2px; }
${H} .bar { grid-template-columns: minmax(0, 1fr) auto auto auto; grid-template-areas: "angle speed play more" "tilt tilt front front" "pace pace pace pace" "zoom zoom zoom centre" "pan pan pan pan"; column-gap: 8px; padding: 4px 8px; }
:host([data-layout="horizontal"][data-flat]) .bar { grid-template-columns: minmax(0, 1fr) auto auto; grid-template-areas: "zoom centre more" "pan pan pan"; }
${H} .angle, ${V} .angle, ${C} .angle { grid-area: angle; }
${H} .tilt, ${V} .tilt, ${C} .tilt { grid-area: tilt; }
${H} .pace-now, ${V} .pace-now { grid-area: speed; }
${H} .play, ${V} .play, ${C} .play { grid-area: play; }
${H} .pacing, ${V} .pacing, ${C} .pacing { grid-area: pace; }
${H} .front, ${V} .front, ${C} .front { grid-area: front; justify-self: start; }
${H} .zoom, ${V} .zoom { grid-area: zoom; }
${H} .pan, ${V} .pan, ${C} .pan { grid-area: pan; justify-self: start; }
${H} .more, ${V} .more, ${C} .more { grid-area: more; margin-inline-start: 0; }
/* Centre, shown once the view is zoomed or moved: beside the zoom, never in the turn's row, so Auto-turn and More stay where they are. */
${H} .centre, ${V} .centre, ${C} .centre { grid-area: centre; justify-self: end; }
/* In the two rows it shares More's column, so it is an icon (its name is read) and never widens that column, which would move Auto-turn. */
@container (max-width: 1039px) {
  ${H} .centre .text { ${UNSEEN} }
  ${H} .centre { padding: 0; }
}
${H} .zoom { display: flex; flex-wrap: nowrap; gap: 4px; min-width: 0; }
${H} .zslide { flex: 1 1 auto; min-width: 0; }
${H} .zoom button, ${V} .zoom button, ${C} .zoom button { padding: 0 10px; }
${H} .zoom button.level, ${V} .zoom button.level, ${C} .zoom button.level { padding: 0 6px; }
@container (max-width: 559px) {
  ${H} .field label, ${H} .field output, ${H} .play .text, ${H} .more .text, ${H} .pace::part(label) { ${UNSEEN} }
  ${H} .play, ${H} .more { padding: 0; }
  ${H} .zbox { min-width: 72px; }
  /* The readout is Fit here (its name says so), which leaves the slider the room for its marks. */
  ${H} [data-b="fit"] { display: none; }
}
/* A phone-safe width (a phone's screen less the page's margins, and a face wider than the system's): the zoom slider takes a row of its own, so its marks never meet the buttons, and the buttons sit under it. */
@container (max-width: 439px) {
  ${H} .zoom { flex-wrap: wrap; }
  ${H} .zslide { flex: 1 0 100%; }
  ${H} .centre { align-self: end; }
  ${H} .zbox { min-width: 0; }
}
/* Wide enough for the turn, Auto-turn, the zoom with its slider, Centre and More on one row, with the angle slider still a slider. */
@container (min-width: 1040px) {
  ${H} .bar { grid-template-columns: minmax(0, 1fr) auto auto auto auto auto; grid-template-areas: "angle speed play zoom centre more" "tilt tilt tilt pace front front" "pan pan pan pan pan pan"; column-gap: 12px; }
  :host([data-layout="horizontal"][data-flat]) .bar { grid-template-columns: minmax(0, 1fr) auto auto; grid-template-areas: "zoom centre more" "pan pan pan"; }
  ${H} .zslide { width: 15rem; }
  ${H} .zoom { display: grid; grid-auto-flow: column; grid-auto-columns: auto; }
  ${H} .pan { justify-self: end; }
}

/* Vertical: a column beside the view, its width --kazoku-column-width (16rem). Auto-turn and More at the top, so More stays put when it opens; then the turn, the zoom and its slider. */
${V} { width: var(--kazoku-column-width, 16rem); max-width: 100%; }
${V} .bar { grid-template-columns: auto auto minmax(0, 1fr) auto; grid-template-areas: "play speed . more" "angle angle angle angle" "tilt tilt tilt tilt" "pace pace pace pace" "front front front front" "zoom zoom zoom zoom" "centre centre centre centre" "pan pan pan pan"; column-gap: 8px; padding: 6px 8px; }
${V} .field { flex: none; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "label value" "slider slider"; gap: 0 8px; }
${V} .field label { grid-area: label; padding-top: 4px; }
${V} .field output { grid-area: value; padding-top: 4px; }
${V} .field input, ${V} .zbox { grid-area: slider; }
${V} .zoom { display: grid; grid-template-columns: auto auto auto minmax(0, 1fr); grid-template-areas: "zs zs zs zs" "out level in fit"; gap: 0 4px; }
${V} .zslide { grid-area: zs; }
${V} [data-b="out"] { grid-area: out; }
${V} [data-b="level"] { grid-area: level; }
${V} [data-b="in"] { grid-area: in; }
${V} [data-b="fit"] { grid-area: fit; justify-self: start; }
${V} .pace::part(label) { ${UNSEEN} }
${V} .pan { flex-wrap: wrap; }
${V} .drag { margin-inline-start: 0; }

/* Compact: one short row (Auto-turn, zoom out, the zoom now, zoom in, More) for a card or a phone. More opens the rest under it: the zoom slider and Fit, the angle, and the advanced controls. */
${C} { display: block; }
:host([data-layout="compact"][overlay]) { inset-inline: 8px auto; bottom: 8px; }
/* Over a card, an open More never reaches past the card's top: the controls scroll inside themselves. */
:host([data-layout="compact"][overlay]) { display: flex; flex-direction: column; max-height: calc(100% - 16px); }
:host([data-layout="compact"][overlay]) .bar { min-height: 0; overflow-y: auto; }
${C} .bar { width: fit-content; max-width: 100%; grid-template-columns: repeat(5, auto); grid-template-areas: "play out level in more" "zs zs zs zs fit" "centre centre centre centre centre" "angle angle angle angle angle" "tilt tilt tilt tilt tilt" "pace pace pace pace pace" "front front front front front" "pan pan pan pan pan"; column-gap: 2px; padding: 2px 4px; border: 1px solid var(--_line); border-radius: 28px; background: var(--_surface); }
:host([data-layout="compact"][data-level="advanced"]) .bar { border-radius: 20px; padding: 2px 8px 6px; column-gap: 4px; }
:host([data-layout="compact"][data-flat]) .bar { grid-template-areas: "out level in more ." "zs zs zs fit fit" "centre centre centre centre centre" "pan pan pan pan pan"; }
${C} .zoom { display: contents; }
${C} .zslide { grid-area: zs; }
${C} [data-b="out"] { grid-area: out; }
${C} [data-b="level"] { grid-area: level; }
${C} [data-b="in"] { grid-area: in; }
${C} [data-b="fit"] { grid-area: fit; }
${C} .play, ${C} .more, ${C} [data-b="out"], ${C} [data-b="level"], ${C} [data-b="in"] { border-color: transparent; }
${C} .play:hover:not(:disabled), ${C} .more:hover:not(:disabled), ${C} .zoom button:hover:not(:disabled) { border-color: var(--_ink); }
${C} .play .text, ${C} .more .text { ${UNSEEN} }
${C} .play, ${C} .more { padding: 0; }
${C} .pace-now { display: none; }
${C} .pacing { flex-wrap: wrap; }
${V} .centre, ${C} .centre { justify-self: start; }
/* The row stays one row: Centre is with Fit, one press of More away. */
:host([data-layout="compact"][data-level="basic"]) .centre { display: none; }
:host([data-layout="compact"][data-level="basic"]) .angle, :host([data-layout="compact"][data-level="basic"]) .zslide, :host([data-layout="compact"][data-level="basic"]) [data-b="fit"] { display: none; }
`;
