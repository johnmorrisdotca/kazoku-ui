// The embed panel with a made-up badge: fourteen to pick from in three groups (so the picker has its chips and its search), a size, the family's seven tabs and an image tab, a preview
// built from the same choices, a choice of the page's own (a ring) and a button of its own (download), then a second panel for a package that draws nothing.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import { embedSnippet } from "./dist/embed-panel/index.js";
import "./dist/embed-panel/define.js";
import { BY_ID, COLORS, svg } from "./badge.js";

const $ = (id) => document.getElementById(id);
const SAY = {
  en: { title: "the embed panel", back: "The view controls", speed: "Speed buttons", intro: "The one \"Put it in your page\" panel of the family. A package gives it a list of things, the code for each way a page is made and the picture the code makes. Pick a badge, choose a size and a tab, and copy.", oneTitle: "A badge, with every part", lede: "Pick a badge, choose how big, then how your page is made. The picture is the code, running.", ring: "Ring", ringOff: "None", ringOn: "Thick", download: "Download the SVG", twoTitle: "A package that draws nothing", twoText: "No picture, no size, two tabs: a data package says what it has and the panel keeps the rest.", credit: "Badges drawn for this demo by the Kazoku UI authors (MIT).", noteImage: "An image address: use it in an <img> tag, a README or an email.", noteIframe: "The embed page is for a site that cannot run script.", image: "Image address", pick: "Badge for the code" },
  ja: { title: "埋め込みパネル", back: "表示の操作", speed: "速さのボタン", intro: "ファミリー共通の「自分のページに入れる」パネルです。パッケージは、入れるものの一覧、ページの作り方ごとのコード、そのコードが作る絵を渡します。バッジを選び、大きさとタブを選んで、コピーします。", oneTitle: "バッジ (すべての部品つき)", lede: "バッジを選び、大きさを選び、ページの作り方を選びます。横の絵は、そのコードを動かしたものです。", ring: "ふち", ringOff: "なし", ringOn: "太い", download: "SVGをダウンロード", twoTitle: "絵がないパッケージ", twoText: "絵も大きさもなく、タブは2つだけです。データのパッケージは、あるものだけを渡し、残りはパネルが受け持ちます。", credit: "このデモのバッジは、Kazoku UIの作者が描きました (MIT)。", noteImage: "画像のアドレスです。imgタグ、README、メールに使えます。", noteIframe: "埋め込みページは、スクリプトを動かせないサイト向けです。", image: "画像のアドレス", pick: "コードにするバッジ" },
};
const say = (key) => SAY[document.documentElement.lang === "ja" ? "ja" : "en"][key];

const state = { ring: false };

const panel = $("panel");
panel.items = COLORS.map(([group, id, label, hex]) => ({ id, label, group, words: hex }));
panel.renderItem = (item) => {
  const holder = document.createElement("span");
  holder.style.cssText = "display:inline-flex;align-items:center;gap:8px";
  const dot = document.createElement("span");
  dot.style.cssText = `width:16px;height:16px;border-radius:50%;background:${BY_ID[item.id].hex};border:1px solid currentColor`;
  holder.append(dot, document.createTextNode(item.label));
  return holder;
};
const spec = (size, preview) => {
  const query = new URLSearchParams({ color: panel.value, ...(state.ring ? { ring: "1" } : {}) });
  return {
    package: "@example/demo-badge", cdn: "https://cdn.jsdelivr.net/npm/@example/demo-badge@1.0.0", tag: "demo-badge", element: "element", entries: [],
    attrs: [["color", panel.value], ...(size !== 320 ? [["size", String(size)]] : []), ...(state.ring ? [["ring", ""]] : [])],
    name: "badge", iframe: { src: `${preview ? "" : "https://example.com/demo-badge/"}embed.html?${query}`, title: BY_ID[panel.value].label, width: size, height: size },
  };
};
panel.generate = ({ kind, size, preview }) => (kind === "image" ? `<img src="https://example.com/demo-badge/badge.svg?color=${panel.value}${state.ring ? "&ring=1" : ""}" width="${size}" height="${size}" alt="${BY_ID[panel.value].label}">` : embedSnippet(kind, spec(size, preview)));
panel.preview = ({ kind, size }) => {
  if (kind === "image") {
    const img = new Image();
    img.alt = BY_ID[panel.value].label;
    img.width = size;
    img.height = size;
    img.src = `data:image/svg+xml,${encodeURIComponent(svg(BY_ID[panel.value], size, state.ring))}`;
    return img;
  }
  if (kind === "iframe") return undefined;
  const badge = document.createElement("demo-badge");
  badge.setAttribute("color", panel.value);
  badge.setAttribute("size", String(size));
  if (state.ring) badge.setAttribute("ring", "");
  return badge;
};
panel.credits = () => say("credit");
panel.note = ({ kind }) => (kind === "image" ? say("noteImage") : kind === "iframe" ? say("noteIframe") : "");
panel.openHref = "embed.html?color=ember";
panel.addEventListener("kazoku-embedchange", () => { panel.openHref = `embed.html?color=${panel.value}${state.ring ? "&ring=1" : ""}`; });
for (const [id, on] of [["ring-off", false], ["ring-on", true]]) {
  $(id).addEventListener("click", () => {
    state.ring = on;
    $("ring-off").setAttribute("aria-pressed", String(!on));
    $("ring-on").setAttribute("aria-pressed", String(on));
    panel.openHref = `embed.html?color=${panel.value}${on ? "&ring=1" : ""}`;
    panel.update();
  });
}
$("download").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `${panel.value}.svg`;
  link.href = URL.createObjectURL(new Blob([svg(BY_ID[panel.value], panel.size, state.ring)], { type: "image/svg+xml" }));
  link.click();
  URL.revokeObjectURL(link.href);
});

// A package with nothing to draw: two tabs, no size, no picture.
const data = $("data");
const dataSpec = { package: "@example/demo-data", cdn: "https://cdn.jsdelivr.net/npm/@example/demo-data@1.0.0", tag: "demo-data", element: "", entries: [], attrs: [["table", "stations"]], name: "data", iframe: { src: "", title: "", width: 0, height: 0 } };
data.generate = ({ kind }) => embedSnippet(kind, dataSpec);

function words() {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = say(el.dataset.say);
  for (const el of document.querySelectorAll("[data-say-label]")) el.setAttribute("aria-label", say(el.dataset.sayLabel));
  panel.labels = { image: say("image") };
  panel.setAttribute("pick-label", say("pick"));
  panel.update();
  data.update();
}
new globalThis.MutationObserver(words).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
words();
