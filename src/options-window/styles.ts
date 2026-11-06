import { BASE_STYLES } from "../shared/base.ts";

// A small card over the view. Shelf docks to the right. Inspector is a wider card. A phone (the sheet class) sits it on the bottom.
export const STYLES = `${BASE_STYLES}
:host { position: absolute; z-index: 2; width: 280px; max-width: calc(100% - 16px); }
:host([hidden]) { display: none; }
:host([data-variant="inspector"]) { width: 420px; }
:host([data-variant="shelf"]) { top: 0; right: 0; bottom: 0; left: auto; width: 240px; height: auto; }
:host(.sheet) { left: 8px !important; right: 8px; top: auto !important; bottom: 8px; width: auto; height: auto; }
:host(:not([open])) { width: max-content; height: auto; bottom: auto; }
.frame { display: flex; flex-direction: column; max-height: 70vh; background: var(--_surface); color: var(--_ink); border: 1px solid var(--_line); border-radius: 12px; box-shadow: 0 8px 24px rgb(0 0 0 / 18%); overflow: hidden; }
.bar { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; padding: 4px; touch-action: none; cursor: grab; }
.bar button[data-act="title"] { flex: 1; justify-content: flex-start; min-width: 48px; cursor: grab; }
.body, .help-panel { padding: 4px 12px 12px; font-weight: 500; }
.help-panel { border-top: 1px solid var(--_line); }
.gestures { margin: 0 0 8px; }
`;
