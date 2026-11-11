// A credit line in pieces, some of them links (a licence, a source's page), for the embed panel's credit and the page
// frame's credit line: the one rule for which addresses may link, and the pieces as nodes or as HTML.

/**
 * One piece of a credit line: a text, or a text that links. A link's `href` is used only where it is http, https or
 * relative; any other (javascript:, data:) is shown as its text. A link opens in a tab of its own.
 *
 * @example
 * ```ts
 * import type { CreditPart } from "@johnmorrisdotca/kazoku-ui/embed-panel/element";
 *
 * const credit: CreditPart[] = ["Flag: ", { text: "CC BY 2.5", href: "https://creativecommons.org/licenses/by/2.5/" }];
 * ```
 */
export type CreditPart = string | { text: string; href: string };

/** A link's address when it is http, https or relative; else null (javascript:, data:, vbscript:, any case or leading space). */
export function safeHref(href: unknown, base = "https://example.invalid/"): string | null {
  if (typeof href !== "string" || href.trim() === "") return null;
  try {
    const url = new URL(href, base);
    return url.protocol === "https:" || url.protocol === "http:" ? href : null;
  } catch {
    return null;
  }
}

/** The pieces that say something, each a text or a link whose text is not empty; anything that is not a list is none. */
export function creditPieces(parts: unknown): CreditPart[] {
  return (Array.isArray(parts) ? (parts as CreditPart[]) : []).filter((part) => (typeof part === "string" ? part !== "" : typeof part?.text === "string" && part.text !== ""));
}

/** The pieces' words alone, for a screen reader's label or a line with no links. */
export function creditText(parts: unknown): string {
  return creditPieces(parts)
    .map((part) => (typeof part === "string" ? part : part.text))
    .join("");
}

/**
 * The pieces as nodes: texts, and `<a>` links (with the given `part`) where the address may link. A link opens in a tab
 * of its own (`target="_blank"`, `rel="noopener noreferrer"`): in someone else's frame it would otherwise take the frame away.
 */
export function creditNodes(doc: Document, parts: readonly CreditPart[], options: { part: string }): (string | HTMLAnchorElement)[] {
  return creditPieces(parts).map((part) => {
    if (typeof part === "string") return part;
    const href = safeHref(part.href, doc.baseURI);
    if (href === null) return part.text;
    const link = doc.createElement("a");
    link.href = href;
    link.textContent = part.text;
    link.setAttribute("part", options.part);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  });
}

/** Pieces written as JSON in an attribute, or null where there are none or the text is not a list of pieces. */
export function parseCreditParts(json: string | null): CreditPart[] | null {
  if (json === null || json.trim() === "") return null;
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return null;
    const parts = value.filter(
      (one): one is CreditPart =>
        typeof one === "string" || (typeof one === "object" && one !== null && typeof (one as { text?: unknown }).text === "string" && typeof (one as { href?: unknown }).href === "string"),
    );
    return parts.length > 0 ? parts : null;
  } catch {
    return null;
  }
}
