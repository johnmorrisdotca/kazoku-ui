// The styles every interface part starts from. The tokens are read as custom properties with the design's own values as the fallback (see tokens.ts), dark always.
import { kui, RADII, SIZES, TOKEN_PROPERTIES } from "./tokens.ts";

export const PHONE = "@media (max-width: 640px)";

const SANS = `var(--kui-font, ${TOKEN_PROPERTIES["--kui-font"]})`;
export const MONO = `var(--kui-font-mono, ${TOKEN_PROPERTIES["--kui-font-mono"]})`;

/** The ground of the parts: colours, the type, the focus ring, hidden text, the touch target and a forced-colours fallback. */
export const UI_BASE = `
:host { box-sizing: border-box; color: ${kui("text")}; font: 400 14px/1.4 ${SANS}; color-scheme: dark; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
:host([hidden]) { display: none !important; }
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
.vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.mono { font-family: ${MONO}; font-variant-numeric: tabular-nums; }
.label { margin: 0; color: ${kui("text-quiet")}; font-size: 11px; font-weight: 500; line-height: 1.3; letter-spacing: 0.08em; text-transform: uppercase; }
button, a, input, select { font: inherit; }
button { -webkit-appearance: none; appearance: none; margin: 0; cursor: pointer; }
button:disabled { opacity: 0.4; cursor: default; }
a { color: ${kui("sky")}; }
a:hover { color: ${kui("sky-hover")}; }
:is(button, a, input, summary, [tabindex]):focus-visible { outline: 2px solid ${kui("sun")}; outline-offset: 2px; }
.panel { background: ${kui("panel")}; border: 1px solid ${kui("line")}; border-radius: var(--kui-radius-panel, ${RADII.panel}px); }
.float { box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45); }
@media (forced-colors: active) { .panel, button, a { border-color: CanvasText; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }
`;

/** Where a floating part sits: `placement` is `fixed` (to the screen; the default), `absolute` (to the nearest positioned ancestor) or `static` (in the flow). */
export const PLACEMENT = `
:host([placement="absolute"]) { position: absolute; }
:host([placement="static"]) { position: relative; transform: none; }
`;

export const TOUCH = `${SIZES.touch}px`;
