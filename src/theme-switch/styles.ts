import { BASE_STYLES } from "../shared/base.ts";

// Light, Dark and Auto as one row of buttons. On a phone the words are left to a screen reader and the icons stay.
export const STYLES = `${BASE_STYLES}
@media (max-width: 640px) {
  .t { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  button { padding: 0; }
}
`;
