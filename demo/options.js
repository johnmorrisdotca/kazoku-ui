// The options window holds the page's own controls. This page only gives it a line of text.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import "./dist/options-window/define.js";

const SAY = {
  en: { title: "options window", back: "The view controls", intro: "A small window over the view. Drag the title, fold it to a chip, and snap it to a corner. The page fills it." },
  ja: { title: "オプションの窓", back: "表示の操作", intro: "ビューの上に浮かぶ、小さな窓です。タイトルをドラッグすると、移動して角に吸い付きます。しまうとチップになります。中身はページが入れます。" },
};
const say = (key) => SAY[document.documentElement.lang === "ja" ? "ja" : "en"][key];

function words() {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = say(el.dataset.say);
  const lang = document.documentElement.lang || "en";
  document.getElementById("win").setAttribute("lang", lang);
  document.getElementById("shelf").setAttribute("lang", lang);
}
new globalThis.MutationObserver(words).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
words();
