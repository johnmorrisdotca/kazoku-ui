// The reading page: one layout, filled with Jupiter's data at the moment the page was opened.
import { $, lang, onLang } from "./interface-demo.js";
import { jupiterReading } from "./interface-data.js";

const SAY = {
  en: { title: "the reading page", back: "The view controls", view: "The parts over a view", parts: "Every part, one at a time" },
  ja: { title: "読むためのページ", back: "表示の操作", view: "ビューの上の部品", parts: "部品を一つずつ" },
};
const page = $("page");
const opened = Date.now();
const NAMES = { en: { now: "Now", universe: "Universe", atlas: "Atlas", planets: "Planets", search: "Search stars, planets, rockets" }, ja: { now: "いま", universe: "宇宙", atlas: "図鑑", planets: "惑星", search: "星、惑星、ロケットを検索" } };
onLang(() => {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = SAY[lang()][el.dataset.say];
  const words = NAMES[lang()];
  $("top").sections = [{ label: words.now, href: "#now" }, { label: words.universe, href: "interface.html" }, { label: words.atlas, href: "interface-page.html", current: true }];
  $("top").setAttribute("placeholder", words.search);
  page.data = { ...jupiterReading(opened), breadcrumb: [{ label: words.atlas, href: "interface.html" }, { label: words.planets, href: "interface.html" }, { label: { en: "Jupiter", ja: "木星" } }] };
});
