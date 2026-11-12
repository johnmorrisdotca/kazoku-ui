import { BASE_STYLES } from "../shared/base.ts";

// A search box, a short suggestion list, and the chosen rows. The suggestion list is absolutely placed so opening it does not push the page down.
export const STYLES = `${BASE_STYLES}
:host([hidden]) { display: none; }
:host { display: block; max-width: 28rem; }
.field { position: relative; }
input { box-sizing: border-box; width: 100%; min-height: 48px; margin: 0; padding: 0 14px; border: 1px solid var(--_line); border-radius: 24px; background: var(--_surface); color: var(--_ink); font: inherit; }
input:focus-visible { outline: 2px solid var(--_ink); outline-offset: 2px; }
.list { position: absolute; z-index: 2; left: 0; right: 0; top: calc(100% + 4px); max-height: 16rem; margin: 0; padding: 4px; overflow: auto; list-style: none; border: 1px solid var(--_line); border-radius: 12px; background: var(--_surface); }
.list button, .row button { width: 100%; justify-content: flex-start; border-radius: 8px; }
.list button[aria-selected="true"] { background: var(--_ink); color: var(--_surface); }
.chosen { margin: 12px 0 0; }
.chosen p { margin: 0 0 6px; }
.rows { display: flex; flex-direction: column; gap: 4px; margin: 0; padding: 0; list-style: none; }
.row { display: flex; align-items: center; gap: 4px; }
.row .name { flex: 1; min-width: 0; }
.row button { width: auto; }
.quiet { margin: 6px 0 0; font-weight: 500; }
`;
