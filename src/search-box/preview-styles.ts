// The preview pane's styles, adopted by the box only when it first draws a preview, so a page that uses the box without previews does not carry them.
export const PREVIEW_STYLES = `
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
.pv-kind { display: block; font-size: 0.75rem; font-weight: 500; opacity: 0.8; overflow-wrap: anywhere; }
.pv-facts { display: grid; grid-template-columns: minmax(0, max-content) minmax(0, 1fr); gap: 3px 10px; margin: 0 0 8px; font-size: 0.8rem; }
.pv-facts dt { font-weight: 500; opacity: 0.8; overflow-wrap: anywhere; }
.pv-facts dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
.pv-acts { display: flex; flex-wrap: wrap; gap: 6px; }
.pv-acts button { min-width: 0; min-height: 36px; padding: 0 12px; border-radius: 18px; font-size: 0.8rem; }
.pv-acts button[aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; }
.preview[data-stale] .pv-body { opacity: 0.6; }
@media (pointer: coarse) { .pv-back, .pv-acts button { min-height: 44px; } }
`;
