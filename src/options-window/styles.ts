import { BASE_STYLES } from "../shared/base.ts";

// A small card over the view. Shelf docks to the right. Inspector is a wider card. A phone (the sheet class) sits it on the bottom.
export const STYLES = `${BASE_STYLES}
:host { position: absolute; z-index: 2; width: 280px; max-width: calc(100% - 16px); outline: none; }
:host([hidden]) { display: none; }
:host([data-variant="inspector"]) { width: 420px; }
:host([data-variant="shelf"]) { top: 0; right: 0; bottom: 0; left: auto; width: 240px; height: auto; }
:host(.as-sheet) { left: 8px !important; right: 8px; top: auto !important; bottom: 8px; width: auto; height: auto; }
:host(:not([open])) { width: max-content; height: auto; bottom: auto; }
.frame { position: relative; display: flex; flex-direction: column; max-height: 70vh; background: var(--_surface); color: var(--_ink); border: 1px solid var(--_line); border-radius: 12px; box-shadow: 0 8px 24px rgb(0 0 0 / 18%); overflow: visible; }
.grab { display: none; width: 36px; height: 4px; margin: 6px auto 0; border-radius: 2px; background: var(--_line); }
:host(.as-sheet) .grab { display: block; }
.bar { display: flex; align-items: center; flex-wrap: nowrap; gap: 6px; padding: 4px 6px; touch-action: none; cursor: grab; }
.handle { display: grid; grid-template-columns: 3px 3px; gap: 2px; width: 8px; padding: 4px; cursor: grab; }
.handle i { width: 3px; height: 3px; border-radius: 50%; background: currentColor; }
.name { flex: 1 1 auto; align-self: stretch; display: flex; align-items: center; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: grab; }
.bar button[data-act="help"], .bar button[data-act="fold"] { width: 28px; min-width: 28px; height: 28px; min-height: 28px; padding: 0; border-radius: 6px; }
.body { padding: 4px 12px 12px; font-weight: 500; }
.help-panel { position: absolute; top: 0; right: calc(100% + 8px); width: 260px; max-height: 70vh; overflow: auto; padding: 8px 12px; background: var(--_surface); color: var(--_ink); border: 1px solid var(--_line); border-radius: 12px; box-shadow: 0 8px 24px rgb(0 0 0 / 18%); }
:host(.as-sheet) .help-panel { position: static; width: auto; right: auto; box-shadow: none; }
.gestures { width: 100%; border-collapse: collapse; margin: 0 0 8px; font-size: 12px; }
.gestures th, .gestures td { text-align: left; vertical-align: top; padding: 2px 8px 2px 0; font-weight: 500; }
`;
