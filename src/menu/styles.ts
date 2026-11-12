import { BASE_STYLES } from "../shared/base.ts";

// A button that opens a panel of the page's own controls. On a phone the panel is a sheet from the bottom.
export const STYLES = `${BASE_STYLES}
:host { position: relative; }
.opener svg { width: 22px; height: 22px; }
.panel {
  position: absolute;
  z-index: 30;
  right: 0;
  top: calc(100% + 8px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: min(320px, 100vw);
  max-width: min(420px, calc(100vw - 16px));
  max-height: min(70vh, 640px);
  overflow: auto;
  padding: 12px;
  border: 1px solid var(--_line);
  border-radius: 16px;
  background: var(--_surface);
  box-shadow: 0 8px 28px rgb(0 0 0 / 18%);
}
.panel ::slotted(*) { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.close { align-self: end; }
@media (max-width: 700px) {
  .panel {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    max-width: none;
    min-width: 0;
    max-height: 80vh;
    border-radius: 16px 16px 0 0;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
  }
}
`;
