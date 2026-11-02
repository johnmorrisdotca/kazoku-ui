// What every part's styles start from: the colours as custom properties on the host (--kazoku-ink, --kazoku-surface, --kazoku-line, --kazoku-accent), light and dark
// (`data-scheme`, which `watchScheme` keeps, or `theme="light|dark"` set by the page), the 48 px button and the focus ring.
export const BASE_STYLES = `
:host {
  --_ink: var(--kazoku-ink, #1b1b1f);
  --_surface: var(--kazoku-surface, #ffffff);
  --_line: var(--kazoku-line, #c9ccd3);
  --_accent: var(--kazoku-accent, #2457d6);
  display: inline-block;
  box-sizing: border-box;
  color: var(--_ink);
  font: 600 0.9rem/1.2 system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", "Segoe UI", sans-serif;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :host(:not([theme="light"]):not([data-scheme="light"])) {
    --_ink: var(--kazoku-ink, #f1f2f6);
    --_surface: var(--kazoku-surface, #1c1d22);
    --_line: var(--kazoku-line, #4a4d58);
    --_accent: var(--kazoku-accent, #8fb0ff);
  }
}
:host([theme="dark"]), :host([data-scheme="dark"]:not([theme="light"])) {
  --_ink: var(--kazoku-ink, #f1f2f6);
  --_surface: var(--kazoku-surface, #1c1d22);
  --_line: var(--kazoku-line, #4a4d58);
  --_accent: var(--kazoku-accent, #8fb0ff);
  color-scheme: dark;
}
:host([theme="light"]) { color-scheme: light; }
[hidden] { display: none !important; }
.vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.group { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px; }
button { -webkit-appearance: none; appearance: none; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 48px; min-height: 48px; margin: 0; padding: 0 14px; border: 1px solid var(--_line); border-radius: 24px; background: var(--_surface); color: var(--_ink); font: inherit; cursor: pointer; white-space: nowrap; }
button:hover:not(:disabled) { border-color: var(--_ink); }
button:focus-visible { outline: 2px solid var(--_ink); outline-offset: 2px; }
button[aria-pressed="true"] { background: var(--_ink); color: var(--_surface); border-color: var(--_ink); }
button:disabled { opacity: 0.4; cursor: default; }
svg { width: 18px; height: 18px; fill: currentColor; flex: none; }
`;
