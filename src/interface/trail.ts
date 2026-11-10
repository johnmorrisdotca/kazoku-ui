// The top bar's trail ("Solar system / Jupiter 木星"), with no DOM.
import type { Bilingual } from "./card.ts";

/** One step of where you are. A word is shown as it is; a pair is shown side by side, English and Japanese. Every step but the last can be a link. */
export interface TrailItem {
  label: string | Bilingual;
  href?: string;
}

/** One link in the top bar's sections: a site's Now, Universe, Atlas, with the current one marked. */
export interface SectionLink {
  label: string;
  href: string;
  current?: boolean;
}

/** The trail as plain text, for a title or a test: "Solar system / Jupiter 木星". */
export function trailText(items: readonly TrailItem[]): string {
  return items.map((item) => (typeof item.label === "string" ? item.label : item.label.ja !== "" && item.label.ja !== item.label.en ? `${item.label.en} ${item.label.ja}` : item.label.en)).join(" / ");
}
