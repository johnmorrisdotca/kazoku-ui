import { BASE_STYLES } from "../shared/base.ts";

// A box, and under it one popup: a row of kind chips, then the groups. The popup is placed over the page so opening it does not push the page down, and it fills the box's width,
// which on a phone is the page's. The look is compact: a result is one line of name over a quieter line of detail, with its actions as small icon buttons on the right; the chips are
// small and scroll sideways on one row. When a row carries a preview the popup has a second column for it (or, on a narrow box, a sheet opened from a Details button). On a coarse pointer (a finger) every row, icon button and chip grows to a 44 px target. Nothing moves, so there is no motion to turn off.
export const STYLES = `${BASE_STYLES}
:host([hidden]) { display: none; }
:host { display: block; position: relative; width: 100%; }
.field { position: relative; }
input { box-sizing: border-box; width: 100%; min-height: 48px; margin: 0; padding: 0 16px; border: 1px solid var(--_line); border-radius: 24px; background: var(--_surface); color: var(--_ink); font: inherit; font-weight: 500; }
input:focus-visible { outline: 2px solid var(--_ink); outline-offset: 2px; }
.panel { position: absolute; z-index: 5; left: 0; right: 0; top: calc(100% + 4px); box-sizing: border-box; max-height: min(70vh, 32rem); overflow: auto; padding: 6px; border: 1px solid var(--_line); border-radius: 12px; background: var(--_surface); }
.chips { display: flex; flex-wrap: nowrap; align-items: center; gap: 4px; margin: 0 0 4px; padding: 2px; overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain; scrollbar-width: none; }
.chips::-webkit-scrollbar { display: none; }
.chips[data-fade~="start"] { -webkit-mask-image: linear-gradient(to right, transparent, #000 24px); mask-image: linear-gradient(to right, transparent, #000 24px); }
.chips[data-fade~="end"] { -webkit-mask-image: linear-gradient(to left, transparent, #000 24px); mask-image: linear-gradient(to left, transparent, #000 24px); }
.chips[data-fade~="start"][data-fade~="end"] { -webkit-mask-image: linear-gradient(to right, transparent, #000 24px, #000 calc(100% - 24px), transparent); mask-image: linear-gradient(to right, transparent, #000 24px, #000 calc(100% - 24px), transparent); }
.chips button { flex: none; min-width: 0; min-height: 24px; height: 24px; padding: 0 9px; border-radius: 12px; font-size: 0.75rem; }
.chips button:focus-visible { outline-offset: -2px; }
.chips .n { font-weight: 400; opacity: 0.75; }
.note { margin: 4px 8px; font-weight: 500; }
.list { min-width: 0; }
[role="rowgroup"] { display: grid; grid-template-columns: minmax(0, 1fr) auto; margin: 0 0 2px; }
[role="rowgroup"] > [role="row"] { grid-column: 1 / -1; }
[role="rowgroup"] > .head { grid-column: 1; grid-row: 1; align-self: center; }
.gh { display: flex; align-items: baseline; gap: 6px; padding: 6px 6px 2px; font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.85; }
.gh .n { font-weight: 400; }
.row { box-sizing: border-box; position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 0 4px; min-height: 40px; padding: 2px 4px 2px 8px; border-radius: 8px; cursor: pointer; }
.row:hover { background: var(--_line); }
.row[aria-selected="true"] { background: var(--_line); box-shadow: inset 3px 0 0 var(--_accent); }
.ico { flex: none; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; margin-right: 6px; }
.ico svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.ico svg.f { fill: currentColor; stroke: none; }
.ico img { width: 20px; height: 20px; object-fit: contain; border-radius: 4px; }
.ico .tx { font-size: 16px; line-height: 1; }
.main { flex: 1 1 0; min-width: 0; padding: 2px 0; }
.label { display: block; font-size: 0.9rem; font-weight: 600; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.detail { display: block; font-size: 0.72rem; font-weight: 500; line-height: 1.2; opacity: 0.78; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
mark { background: none; color: inherit; font-weight: 800; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 2px; text-decoration-color: var(--_accent); }
.cell { display: contents; }
.row button { position: relative; flex: none; min-width: 0; min-height: 0; height: 28px; padding: 0 8px; border-radius: 8px; font-size: 0.78rem; }
.row button.ic { width: 30px; height: 30px; padding: 0; border-color: transparent; border-radius: 15px; background: none; }
.row button.ic:hover { background: var(--_surface); }
.row button.ic[aria-pressed="true"] { background: none; border-color: transparent; color: var(--_accent); }
.ic svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.ic[aria-pressed="true"] svg { fill: currentColor; }
.more svg { stroke-width: 3; }
.ic .lab { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.more { order: 1; }
.brk { display: none; }
.row:not([data-more]) .cell[data-ovf] button { position: absolute; width: 1px; height: 1px; min-width: 0; min-height: 0; padding: 0; border: 0; overflow: hidden; clip-path: inset(50%); }
.row[data-more] { row-gap: 4px; padding-bottom: 4px; }
.row[data-more] .brk { display: block; flex: 0 0 100%; height: 0; order: 19; }
.row[data-more] .cell[data-ovf] button { order: 20; }
.row[data-more] .cell[data-ovf] button.ic { width: auto; gap: 4px; padding: 0 10px 0 6px; border: 1px solid var(--_line); border-radius: 8px; background: var(--_surface); }
.row[data-more] .cell[data-ovf] .ic .lab { position: static; width: auto; height: auto; overflow: visible; clip-path: none; }
.row button[aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; }
.row button[data-active] { box-shadow: 0 0 0 2px var(--_accent); }
.extra .main { flex: 0 1 auto; }
.extra .label { font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
.row.extra[data-kind="all"] { grid-column: 2; grid-row: 1; align-self: center; min-height: 22px; padding: 0 6px; font-size: 0.72rem; }
.row.extra[data-kind="all"] .label { font-size: 0.72rem; }
.row.extra[data-kind="more"] { min-height: 32px; }
.panel[data-pv][data-layout="side"] { display: grid; grid-template-columns: minmax(0, 1fr) minmax(13rem, 17rem); column-gap: 8px; align-items: start; }
.panel[data-sheet] .list { display: none; }
.preview { box-sizing: border-box; min-width: 0; padding: 10px; border: 1px solid var(--_line); border-radius: 10px; }
.panel[data-layout="side"] .preview { position: sticky; top: 0; min-height: 12rem; }
.panel[data-layout="sheet"] .preview { padding: 4px; border: 0; }
.pv-back { min-height: 36px; margin: 0 0 8px; padding: 0 12px; border-radius: 18px; font-size: 0.82rem; }
.pv-note { margin: 0; font-size: 0.8rem; font-weight: 500; }
.pv-pic { box-sizing: border-box; display: grid; place-items: center; width: 100%; aspect-ratio: 16 / 10; max-height: 9.5rem; margin: 0 0 8px; overflow: hidden; border-radius: 8px; background: var(--_line); }
.pv-pic > * { max-width: 100%; max-height: 100%; }
.pv-pic img { width: 100%; height: 100%; object-fit: contain; }
.pv-pic[data-failed] img { visibility: hidden; }
.pv-head { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; }
.pv-head .ico { width: 28px; height: 28px; margin: 0; }
.pv-head .ico svg, .pv-head .ico img { width: 26px; height: 26px; }
.pv-head .ico .tx { font-size: 22px; }
.pv-name { min-width: 0; }
.pv-title { display: block; font-size: 1rem; font-weight: 700; overflow-wrap: anywhere; }
.pv-kind { display: block; font-size: 0.75rem; font-weight: 500; opacity: 0.8; }
.pv-facts { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 3px 10px; margin: 0 0 8px; font-size: 0.8rem; }
.pv-facts dt { font-weight: 500; opacity: 0.8; }
.pv-facts dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
.pv-acts { display: flex; flex-wrap: wrap; gap: 6px; }
.pv-acts button { min-width: 0; min-height: 36px; padding: 0 12px; border-radius: 18px; font-size: 0.8rem; }
.pv-acts button[aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; }
.preview[data-stale] .pv-body { opacity: 0.6; }
@media (pointer: coarse) {
  .pv-back, .pv-acts button { min-height: 44px; }
  .chips button { min-height: 44px; height: 44px; padding: 0 14px; border-radius: 22px; }
  .row { min-height: 44px; padding-top: 0; padding-bottom: 0; }
  .row[data-more] { padding-bottom: 4px; }
  .row button { height: 44px; min-height: 44px; padding: 0 12px; }
  .row button.ic { width: 44px; border-radius: 22px; }
  .row[data-more] .cell[data-ovf] button.ic { width: auto; padding: 0 12px 0 8px; }
  .row.extra[data-kind="all"] { min-height: 44px; padding: 0 10px; }
  .row.extra[data-kind="more"] { min-height: 44px; }
}
@media (forced-colors: active) { .row[aria-selected="true"] { outline: 2px solid Highlight; } .row button[data-active] { outline: 2px solid Highlight; } }
`;
