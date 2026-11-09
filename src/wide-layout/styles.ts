import { BASE_STYLES } from "../shared/base.ts";

// One button. On a phone the layout is already one column, so the whole toggle is hidden.
export const STYLES = `${BASE_STYLES}
@media (max-width: 640px) { :host { display: none; } }
`;
