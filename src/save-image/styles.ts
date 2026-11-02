import { BASE_STYLES } from "../shared/base.ts";

// A button for each format, with a download arrow. On a phone the words are left to a screen reader.
export const STYLES = `${BASE_STYLES}
button[aria-busy="true"] { opacity: 0.6; cursor: progress; }
@media (max-width: 640px) {
  .t { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  button { padding: 0; }
}
`;
