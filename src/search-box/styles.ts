import { BASE_STYLES } from "../shared/base.ts";

// A box, and under it one popup: a row of kind chips, then the groups. The popup is placed over the page so opening it does not push the page down, and it fills the box's width,
// which on a phone is the page's. Nothing moves: no transition, so reduced motion has nothing to turn off.
export const STYLES = `${BASE_STYLES}
:host([hidden]) { display: none; }
:host { display: block; position: relative; width: 100%; }
.field { position: relative; }
input { box-sizing: border-box; width: 100%; min-height: 48px; margin: 0; padding: 0 16px; border: 1px solid var(--_line); border-radius: 24px; background: var(--_surface); color: var(--_ink); font: inherit; font-weight: 500; }
input:focus-visible { outline: 2px solid var(--_ink); outline-offset: 2px; }
.panel { position: absolute; z-index: 5; left: 0; right: 0; top: calc(100% + 4px); box-sizing: border-box; max-height: min(70vh, 32rem); overflow: auto; padding: 8px; border: 1px solid var(--_line); border-radius: 14px; background: var(--_surface); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.chips button { min-height: 48px; padding: 0 14px; font-size: 0.85rem; }
.chips .n { font-weight: 500; opacity: 0.8; }
.note { margin: 4px 8px; font-weight: 500; }
[role="rowgroup"] { display: block; margin: 0 0 6px; }
.gh { display: flex; align-items: baseline; gap: 8px; padding: 6px 8px 2px; font-size: 0.78rem; letter-spacing: 0.02em; opacity: 0.85; }
.gh .n { font-weight: 500; }
.row { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 6px; min-height: 48px; padding: 2px 4px 2px 8px; border-radius: 10px; cursor: pointer; }
.row:hover { background: var(--_line); }
.row[aria-selected="true"] { background: var(--_line); box-shadow: inset 3px 0 0 var(--_accent); }
.main { flex: 1 1 10rem; min-width: 0; padding: 4px 0; }
.label { display: block; font-weight: 600; overflow-wrap: anywhere; }
.detail { display: block; font-size: 0.78rem; font-weight: 500; opacity: 0.8; overflow-wrap: anywhere; }
mark { background: none; color: inherit; font-weight: 800; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 2px; text-decoration-color: var(--_accent); }
.cell { display: contents; }
.row button { min-width: 48px; min-height: 48px; padding: 0 12px; font-size: 0.85rem; }
.row button[aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; }
.row button[data-active] { box-shadow: 0 0 0 2px var(--_accent); }
.extra .label { font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
@media (max-width: 520px) { .main { flex-basis: 100%; } }
@media (forced-colors: active) { .row[aria-selected="true"] { outline: 2px solid Highlight; } .row button[data-active] { outline: 2px solid Highlight; } }
`;
