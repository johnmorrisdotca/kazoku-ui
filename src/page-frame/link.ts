// Is a link to the page it is on? The header marks Home as the current page on the home page, so it is not a link that goes nowhere.

/** `index.html` and a trailing slash are the same page; the search and the hash are not part of it. */
const pageOf = (url: URL): string => url.pathname.replace(/index\.html$/, "");

/**
 * True when `href` (relative to `base`) is the page at `base`: `index.html`, `./` and `/demo/` are one page, and a search or hash does not make another.
 *
 * @example
 * samePage("index.html", "https://example.org/demo/?lang=ja"); // true
 * samePage("kids.html", "https://example.org/demo/"); // false
 */
export function samePage(href: string, base: string): boolean {
  try {
    const here = new URL(base);
    const there = new URL(href, here);
    return there.origin === here.origin && pageOf(there) === pageOf(here);
  } catch {
    return false;
  }
}
