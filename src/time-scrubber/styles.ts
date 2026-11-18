import { BASE_STYLES } from "../shared/base.ts";

// A slider track 48 px tall (a finger's height) with a round thumb, ticks under it, then the scale buttons and the date field. A narrow page wraps; it never scrolls sideways.
export const STYLES = `${BASE_STYLES}
:host([hidden]) { display: none; }
:host { display: block; max-width: 100%; }
.wrap { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 12px; }
.slider { flex: 1 1 240px; min-width: 0; }
.track { position: relative; box-sizing: border-box; height: 48px; margin: 0 14px; touch-action: pan-y; cursor: pointer; user-select: none; -webkit-user-select: none; border-radius: 8px; }
.track::before { content: ""; position: absolute; left: 0; right: 0; top: 22px; height: 4px; border-radius: 2px; background: var(--_line); }
.fill { position: absolute; left: 0; top: 22px; height: 4px; border-radius: 2px; background: var(--_accent); }
.thumb { position: absolute; top: 12px; width: 24px; height: 24px; margin-left: -12px; box-sizing: border-box; border-radius: 50%; border: 2px solid var(--_ink); background: var(--_surface); }
.track:focus-visible { outline: 2px solid var(--_ink); outline-offset: 2px; }
.track[data-drag] .thumb { background: var(--_accent); }
.ticks { position: relative; height: 1.1em; margin: 0 14px; font-size: 0.7rem; font-weight: 500; opacity: 0.8; }
.ticks span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }
.scales { display: inline-flex; gap: 4px; }
.field { box-sizing: border-box; min-width: 0; width: 11.5em; max-width: 100%; min-height: 48px; padding: 0 14px; border: 1px solid var(--_line); border-radius: 24px; background: var(--_surface); color: var(--_ink); font: inherit; font-variant-numeric: tabular-nums; }
.field:focus-visible { outline: 2px solid var(--_ink); outline-offset: 2px; }
.field[aria-invalid="true"] { border-color: var(--_ink); border-style: dashed; }
.msg { flex-basis: 100%; margin: 0; font-size: 0.8rem; font-weight: 500; }
`;
