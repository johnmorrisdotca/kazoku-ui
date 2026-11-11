import { BASE_STYLES } from "../shared/base.ts";

// The panel: a picker, the size buttons, the tabs, then the picture beside the code. It stacks when its own box is narrow (a container query on the host, so it
// follows the box it sits in, not the window). The picture sits in a box it always fits: the element inside is scaled down to the box, never cut off.
export const STYLES = `${BASE_STYLES}
:host { display: block; box-sizing: border-box; width: 100%; justify-self: stretch; container-type: inline-size; --_preview-bg: var(--kazoku-preview-bg, var(--_surface)); --_preview-w: var(--kazoku-preview-width, 260px); }
:host([hidden]) { display: none; }
.panel { display: grid; gap: 12px; min-width: 0; }
.title { margin: 0; font-size: 1.25rem; font-weight: 700; line-height: 1.25; }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; }
.lbl { font-weight: 600; }
.pick { display: grid; gap: 8px; min-width: 0; }
.builtin { display: grid; gap: 8px; min-width: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.search { -webkit-appearance: none; appearance: none; box-sizing: border-box; width: 100%; max-width: 320px; min-height: 48px; margin: 0; padding: 0 16px; border: 1px solid var(--_line); border-radius: 24px; background: var(--_surface); color: var(--_ink); font: inherit; }
.search:focus-visible { outline: 2px solid var(--_ink); outline-offset: 2px; }
.search::placeholder { color: var(--_ink); opacity: 0.6; }
.items { display: flex; flex-wrap: wrap; gap: 4px; max-height: 164px; overflow: auto; padding: 2px; }
.items button { white-space: normal; text-align: center; }
.none { margin: 0; font-weight: 400; opacity: 0.75; }
.tabs { display: flex; gap: 4px; overflow-x: auto; padding: 2px; margin: -2px; }
.tabs button { flex: 0 0 auto; }
.tabs button[aria-selected="true"] { background: var(--_ink); color: var(--_surface); border-color: var(--_ink); }
.grid { display: grid; grid-template-columns: minmax(0, var(--_preview-w)) minmax(0, 1fr); gap: 16px; align-items: start; min-width: 0; }
:host([no-preview]) .grid { grid-template-columns: minmax(0, 1fr); }
@container (max-width: 640px) { .grid { grid-template-columns: minmax(0, 1fr); } }
.preview { box-sizing: border-box; display: grid; place-items: center; min-width: 0; min-height: 160px; padding: 8px; overflow: hidden; border: 1px solid var(--_line); border-radius: 12px; background: var(--_preview-bg); }
.frame { position: relative; overflow: hidden; max-width: 100%; }
.fit { display: grid; place-items: center; transform-origin: 0 0; }
.fit > * { max-width: none; }
.fit iframe { border: 0; display: block; }
.codecol { display: grid; gap: 10px; min-width: 0; }
.note { margin: 0; font-weight: 400; font-size: 0.85rem; }
.codebox { box-sizing: border-box; margin: 0; padding: 12px; overflow: auto; max-height: 340px; border: 1px solid var(--_line); border-radius: 12px; background: var(--_surface); color: var(--_ink); font: 400 0.8rem/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; tab-size: 2; white-space: pre; }
.codebox:focus-visible { outline: 2px solid var(--_ink); outline-offset: 2px; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
a.btn { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 48px; min-width: 48px; padding: 0 14px; border: 1px solid var(--_line); border-radius: 24px; background: var(--_surface); color: var(--_ink); font: inherit; text-decoration: none; white-space: nowrap; }
a.btn:hover { border-color: var(--_ink); }
a.btn:focus-visible { outline: 2px solid var(--_ink); outline-offset: 2px; }
button.primary { background: var(--_accent); border-color: var(--_accent); color: var(--_surface); }
button.primary:hover:not(:disabled) { border-color: var(--_ink); }
.status { font-weight: 400; font-size: 0.85rem; min-height: 1.2em; }
.credits { margin: 0; font-weight: 400; font-size: 0.85rem; opacity: 0.85; }
.credits a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
`;
