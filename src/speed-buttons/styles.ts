import { BASE_STYLES } from "../shared/base.ts";

// One button for each speed, side by side; the one that is on is filled. The name comes first and is hidden (for the eye) by `::part(label)` where a page is short of room.
export const STYLES = `${BASE_STYLES}
:host([hidden]) { display: none; }
:host { display: inline-flex; align-items: center; gap: 4px; vertical-align: middle; }
.lbl { margin-inline-end: 4px; }
button { padding: 0 12px; min-width: 48px; font-variant-numeric: tabular-nums; }
:host([no-label]) .lbl { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
`;
