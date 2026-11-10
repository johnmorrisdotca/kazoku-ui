// What the interface demo pages share: the family clock's stand-in, the sample data in the page's language, and a line that says what the last event was (the tests read it).
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import "./dist/interface/define.js";
import "./dist/page-frame/define.js";

export const $ = (id) => document.getElementById(id);
export const lang = () => (document.documentElement.lang === "ja" ? "ja" : "en");

/** Runs `fn` now and each time the page's language changes. */
export function onLang(fn) {
  new MutationObserver(() => fn()).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  fn();
}

/** Says what the last event was, in the output the tests read. */
export function report(output, event) {
  output.textContent = `${event.type} ${JSON.stringify(event.detail)}`;
}
