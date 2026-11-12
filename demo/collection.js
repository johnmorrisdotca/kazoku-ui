// A sample collection: a few named things, so the picker can be tried without any outside data.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import "./dist/page-frame/define.js";
import "./dist/collection-picker/define.js";

const picker = document.querySelector("#picker");
const out = document.querySelector("#out");
const ITEMS = {
  en: [
    { kind: "body", id: "mars", name: "Mars", group: "Planets", keywords: ["red"] },
    { kind: "body", id: "vega", name: "Vega", group: "Stars" },
    { kind: "place", id: "tokyo", name: "Tokyo", group: "Cities", keywords: ["japan"] },
    { kind: "place", id: "osaka", name: "Osaka", group: "Cities" },
    { kind: "craft", id: "probe", name: "Sample probe", group: "Craft" },
  ],
  ja: [
    { kind: "body", id: "mars", name: "火星", group: "惑星", keywords: ["mars", "red"] },
    { kind: "body", id: "vega", name: "ベガ", group: "星", keywords: ["vega"] },
    { kind: "place", id: "tokyo", name: "東京", group: "都市", keywords: ["tokyo"] },
    { kind: "place", id: "osaka", name: "大阪", group: "都市", keywords: ["osaka"] },
    { kind: "craft", id: "probe", name: "探査機", group: "機体", keywords: ["probe"] },
  ],
};
const language = () => (document.documentElement.lang === "ja" ? "ja" : "en");
const show = () => {
  picker.setAttribute("lang", language());
  const ids = picker.value;
  picker.items = ITEMS[language()];
  picker.value = ids;
  out.textContent = ids.join(", ");
};
picker.addEventListener("kazoku-collectionchange", (event) => {
  out.textContent = event.detail.ids.join(", ");
});
document.getElementById("language").addEventListener("kazoku-languagechange", show);
show();
