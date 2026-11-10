import { BASE_STYLES } from "../shared/base.ts";

// The colours: the family's variables as everywhere, and one more, --kazoku-muted, for the credit line's second weight. It is dark enough to read (7:1 on the page colours), never pale grey.
const MUTED = `
:host { --_muted: var(--kazoku-muted, #4a4d57); }
@media (prefers-color-scheme: dark) { :host(:not([theme="light"]):not([data-scheme="light"])) { --_muted: var(--kazoku-muted, #c0c3ce); } }
:host([theme="dark"]), :host([data-scheme="dark"]:not([theme="light"])) { --_muted: var(--kazoku-muted, #c0c3ce); }
`;

const LINK = `
a { display: inline-flex; align-items: center; box-sizing: border-box; min-height: 48px; padding: 0 16px; border: 1px solid var(--_line); border-radius: 24px; background: var(--_surface); color: var(--_ink); font-weight: 600; font-size: 0.95rem; line-height: 1.2; text-decoration: none; }
a:hover { border-color: var(--_ink); }
a:focus-visible { outline: 2px solid var(--_ink); outline-offset: 2px; }
@media (forced-colors: active) { a { border-color: ButtonText; } }
`;

// The header: one line (the package's name, what the page shows) and the links beside it; on a phone the links go under the line. No background and no bar of its own: it sits in the page's header.
export const HEADER_STYLES = `${BASE_STYLES}${MUTED}${LINK}
:host { display: block; font: 400 1rem/1.4 system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", "Segoe UI", sans-serif; }
.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 16px; }
.line { flex: 1 1 20rem; min-width: 0; margin: 0; overflow-wrap: break-word; }
.name { font-weight: 700; }
nav { display: flex; flex-wrap: wrap; gap: 8px; }
a[aria-current="page"] { background: var(--_ink); color: var(--_surface); border-color: var(--_ink); }
@media (max-width: 640px) { .line { flex-basis: 100%; } }
`;

// The credit line: always shown, never folded. Normal size is 15 px; the embed form is 13 px, in the dark second colour, with the link inline.
export const CREDITS_STYLES = `${BASE_STYLES}${MUTED}${LINK}
:host { display: block; font: 400 0.9375rem/1.45 system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", "Segoe UI", sans-serif; }
.box { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; padding: 12px 0; border-top: 1px solid var(--_line); }
p { flex: 1 1 20rem; min-width: 0; margin: 0; overflow-wrap: break-word; }
.lead { font-weight: 700; }
:host([embed]) { font-size: 0.8125rem; color: var(--_muted); }
:host([embed]) .box { display: block; padding: 6px 0; border-top: 0; }
:host([embed]) p { display: inline; }
:host([embed]) a { display: inline; min-height: 0; padding: 0; border: 0; border-radius: 0; background: none; color: inherit; font-size: inherit; text-decoration: underline; }
:host([embed]) a:focus-visible { outline-offset: 1px; }
`;
