// Puts an element's styles into its shadow root in a way a strict Content-Security-Policy allows.
//
// A `<style>` written into a shadow root is inline style, which `style-src 'self'` blocks. A constructable stylesheet handed to `adoptedStyleSheets` is not inline
// markup and needs no allowance, so it is used wherever the browser has it. Where it does not (older browsers), the same text goes into a `<style>` element, and a
// page with a strict `style-src` allows that one with a nonce: the element's `nonce` is copied onto the `<style>`.
const sheets = new Map<string, CSSStyleSheet>();

/** True when this browser can adopt a constructable stylesheet into a shadow root. */
export function canAdopt(root: ShadowRoot): boolean {
  return typeof CSSStyleSheet === "function" && "replaceSync" in CSSStyleSheet.prototype && "adoptedStyleSheets" in root;
}

/** Adds `css` to `root`: as an adopted stylesheet where there is one (one sheet, shared by every element with the same text), else as a `<style>` carrying `nonce`. */
export function adoptStyles(root: ShadowRoot, css: string, nonce = ""): void {
  if (canAdopt(root)) {
    try {
      let sheet = sheets.get(css);
      if (sheet === undefined) {
        sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        sheets.set(css, sheet);
      }
      if (!root.adoptedStyleSheets.includes(sheet)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      return;
    } catch {
      /* a browser that has the API and refuses it: the <style> below */
    }
  }
  const style = (root.ownerDocument ?? document).createElement("style");
  if (nonce !== "") style.setAttribute("nonce", nonce);
  style.textContent = css;
  root.prepend(style);
}
