// Kazoku UI 家族: the family's shared interface parts, each its own subpath so a page loads only what it uses.
/** The subpaths of the parts, in the order they were added. */
export const PARTS = ["view-controls", "theme-switch", "language-picker", "address-state"] as const;
export type Part = (typeof PARTS)[number];
