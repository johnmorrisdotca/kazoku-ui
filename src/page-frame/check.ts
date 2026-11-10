// A check a package runs over the HTML its build wrote (site/*.html), or over its page sources: does the page say what it is, and carry the header and the credit line?
// It reads text and needs no DOM, so it runs in `node --test`.

/** What a page must have. An embed page (made for someone else's site) needs the credit line only. */
export interface PageCheckOptions {
  /** True for a page that sits inside another site: the credit line, in its small form, and no header. */
  embed?: boolean;
}

const attributeOf = (tag: string, name: string): string | undefined => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
const tagOf = (html: string, name: string): string | undefined => new RegExp(`<${name}(?:\\s[^>]*)?>`).exec(html)?.[0];

/**
 * What is wrong with one page's HTML, as lines of text; an empty list means the page is fine. A page needs a real `<title>` and description in the HTML itself, a
 * `<kazoku-page-header>` saying what it is (a `what`), and a `<kazoku-page-credits>` with a line of credits or a link to them. An embed page needs the credit line, marked `embed`.
 *
 * @example
 * pageProblems(readFileSync("site/gallery.html", "utf8")); // []
 */
export function pageProblems(html: string, options: PageCheckOptions = {}): string[] {
  const problems: string[] = [];
  const title = /<title[^>]*>([\s\S]*?)<\/title>/.exec(html)?.[1]?.trim() ?? "";
  if (title === "") problems.push("no <title> in the HTML (it must be written at build time, not added by script)");
  const description = /<meta\s[^>]*name="description"[^>]*>/.exec(html)?.[0];
  if (description === undefined || (attributeOf(description, "content") ?? "").trim().length < 20) problems.push('no <meta name="description"> of a sentence or more in the HTML');
  if (options.embed !== true) {
    const header = tagOf(html, "kazoku-page-header");
    if (header === undefined) problems.push("no <kazoku-page-header>: say what the page is, and give a way home");
    else if ((attributeOf(header, "what") ?? "").trim() === "") problems.push("the <kazoku-page-header> has no what=: say in a few words what this page shows");
  }
  const credits = tagOf(html, "kazoku-page-credits");
  if (credits === undefined) problems.push("no <kazoku-page-credits>: credit the page's data, or link to where it is credited");
  else {
    if ((attributeOf(credits, "credits") ?? "").trim() === "" && (attributeOf(credits, "href") ?? "").trim() === "") problems.push("the <kazoku-page-credits> has neither credits= nor href=");
    if (options.embed === true && !/\sembed(\s|=|>)/.test(credits)) problems.push("an embed page's <kazoku-page-credits> needs the embed attribute");
  }
  return problems;
}
