// The made-up badge the embed panel's demo puts in a page: a disc, its initial and an optional ring, drawn at the size it is given. The demo and its embed page share it.
export const COLORS = [
  ["Warm", "ember", "Ember", "#d9480f"], ["Warm", "amber", "Amber", "#b7791f"], ["Warm", "rose", "Rose", "#c2255c"], ["Warm", "coral", "Coral", "#e8590c"], ["Warm", "sand", "Sand", "#a68a64"],
  ["Cool", "ocean", "Ocean", "#1864ab"], ["Cool", "teal", "Teal", "#0b7285"], ["Cool", "mint", "Mint", "#2b8a3e"], ["Cool", "iris", "Iris", "#5f3dc4"], ["Cool", "sky", "Sky", "#1c7ed6"],
  ["Neutral", "ink", "Ink", "#343a40"], ["Neutral", "stone", "Stone", "#6c757d"], ["Neutral", "slate", "Slate", "#495057"], ["Neutral", "chalk", "Chalk", "#868e96"],
];
export const BY_ID = Object.fromEntries(COLORS.map(([group, id, label, hex]) => [id, { group, id, label, hex }]));

export const svg = (pick, size, ring) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${pick.label}"><circle cx="50" cy="50" r="${ring ? 40 : 46}" fill="${pick.hex}"${ring ? ' stroke="#f1f2f6" stroke-width="8"' : ""}/><text x="50" y="62" text-anchor="middle" font-size="36" font-family="system-ui, sans-serif" font-weight="700" fill="#ffffff">${pick.label.charAt(0)}</text></svg>`;

class DemoBadge extends HTMLElement {
  static observedAttributes = ["color", "size", "ring"];
  connectedCallback() { this.attachShadow({ mode: "open" }); this.draw(); }
  attributeChangedCallback() { if (this.shadowRoot) this.draw(); }
  draw() {
    const pick = BY_ID[this.getAttribute("color")] ?? BY_ID.ember;
    this.shadowRoot.innerHTML = svg(pick, Number(this.getAttribute("size") ?? 320), this.hasAttribute("ring"));
  }
}
if (!customElements.get("demo-badge")) customElements.define("demo-badge", DemoBadge);
