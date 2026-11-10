// The reading page: one layout, filled with Jupiter's data at the moment the page was opened.
import { $, lang, onLang } from "./interface-demo.js";
import { jupiterReading } from "./interface-data.js";

const SAY = {
  en: { title: "the reading page", back: "The view controls", view: "The parts over a view", parts: "Every part, one at a time" },
  ja: { title: "読むためのページ", back: "表示の操作", view: "ビューの上の部品", parts: "部品を一つずつ" },
};
const page = $("page");
page.data = jupiterReading(Date.now());
$("top").sections = [{ label: "Now", href: "#now" }, { label: "Universe", href: "interface.html" }, { label: "Atlas", href: "interface-page.html", current: true }];
onLang(() => { for (const el of document.querySelectorAll("[data-say]")) el.textContent = SAY[lang()][el.dataset.say]; });
