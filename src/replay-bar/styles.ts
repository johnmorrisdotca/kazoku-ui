import { BASE_STYLES } from "../shared/base.ts";

// One row: play, back to the start, repeat, then the speed buttons. Nothing folds away. A narrow page wraps the row; it does not scroll the page sideways.
export const STYLES = `${BASE_STYLES}
:host([hidden]) { display: none; }
:host { display: flex; vertical-align: middle; }
.row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
button[aria-pressed="true"] { background: var(--_ink); color: var(--_surface); }
`;
