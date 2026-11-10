// Each interface part on its own, in tabs: the chosen part and its states on one screen.
import { $, lang, onLang, report } from "./interface-demo.js";
import { createStandInClock } from "./dist/interface/clock-adapter.js";
import { COLOURS, ICON_NAMES, sourcesFromCredits } from "./dist/interface/index.js";
import { CREDITS, jupiterCard, LAYERS } from "./interface-data.js";

const TABS = [
  ["tokens", { en: "Colour and type", ja: "色と文字" }], ["icon", { en: "Icon button", ja: "アイコンボタン" }], ["bar", { en: "Control bar", ja: "操作バー" }], ["scale", { en: "Scale switch", ja: "スケール切り替え" }],
  ["card", { en: "Object card", ja: "天体カード" }], ["layers", { en: "Layers panel", ja: "レイヤーパネル" }], ["segmented", { en: "Segmented switch", ja: "切り替えスイッチ" }],
  ["buttons", { en: "Buttons", ja: "ボタン" }], ["top", { en: "Top bar", ja: "トップバー" }], ["footer", { en: "Footer", ja: "フッター" }],
];
const SAY = {
  en: {
    title: "interface parts, one at a time", back: "The view controls", view: "The parts over a view", reading: "The reading page",
    tokensH: "Colour and type", tokensT: "Dark first. One warm colour marks what you can do; one cool colour marks where you can go. Numbers, dates, times and units are always in Plex Mono.",
    iconH: "Icon button", iconT: "A real button, 44 by 44 px, an 18 px icon. Clear at rest, filled on hover and when on. Every one has an accessible name.",
    barH: "Control bar", barT: "The same on every view, in this order. A view that cannot do one leaves it out. Press the clock to pick any date and time.", barSmall: "Without Your place and Free flight:",
    scaleH: "Scale switch", scaleT: "Five steps, always in this order. A panel at the left on a desk, a row of pills on a phone.",
    cardH: "Object card", cardT: "One layout for a star, a planet, a moon, a galaxy, a black hole or a rocket. Every number links to its source; a number worked out for the time shown is never blank.",
    layersH: "Layers panel", layersT: "Real checkboxes, in two columns. It also lists the data door's outside sources, each with its credit and licence, so one can be switched off.",
    segH: "Segmented switch", segT: "For the language and for the sky culture. The chosen segment is filled; each is a button with aria-pressed.",
    buttonsH: "Buttons", buttonsT: "One filled button a screen, for the main thing to do. Everything else is outlined or an icon.",
    topH: "Top bar", topT: "The brand, where you are, search and the language. A sky view adds the sky culture switch to the bar itself.",
    footH: "Footer and credits line", footT: "On a view, one quiet line. On a reading page, the footer with the sources, how to cite and the sheets.",
  },
  ja: {
    title: "インターフェースの部品を一つずつ", back: "表示の操作", view: "ビューの上の部品", reading: "読むためのページ",
    tokensH: "色と文字", tokensT: "基本はダーク。暖かい色は「できること」を、冷たい色は「行き先」を示します。数値、日付、時刻、単位は、いつもPlex Monoで表示します。",
    iconH: "アイコンボタン", iconT: "本物のボタンで、大きさは44×44px、アイコンは18pxです。ふだんは透明で、ホバー時とオン時に塗られます。どれにも、スクリーンリーダー向けの名前があります。",
    barH: "操作バー", barT: "どのビューでも同じ順番です。できない操作は省かれます。時計を押すと、好きな日付と時刻を選べます。", barSmall: "「現在地」と「自由飛行」がない場合：",
    scaleH: "スケール切り替え", scaleT: "5つの段階は、いつもこの順番です。パソコンでは左側のパネル、スマホでは丸みのあるボタンが横一列に並びます。",
    cardH: "天体カード", cardT: "星、惑星、衛星、銀河、ブラックホール、ロケットのどれも同じ形式です。すべての数値に出典へのリンクがあり、表示中の時刻で計算する数値は空欄になりません。",
    layersH: "レイヤーパネル", layersT: "本物のチェックボックスが2列に並びます。データの入り口から来る外部の出典も、クレジットとライセンスつきで並び、1つずつオフにできます。",
    segH: "切り替えスイッチ", segT: "言語と星座の文化を切り替えます。選んだものが塗られ、どれもaria-pressedを持つボタンです。",
    buttonsH: "ボタン", buttonsT: "1画面に塗りのボタンは1つだけで、いちばん大事な操作に使います。そのほかは枠線のボタンかアイコンです。",
    topH: "トップバー", topT: "ブランド、今いる場所、検索、言語です。星空のビューでは、星座の文化の切り替えもバーの中に出ます。",
    footH: "フッターと出典の行", footT: "ビューでは、目立たない1行です。読むためのページでは、出典、引用のしかた、印刷用シートのあるフッターです。",
  },
};

const tabs = $("tabs");
for (const [id] of TABS) {
  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "tab";
  tab.id = `t-${id}`;
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-controls", `p-${id}`);
  tab.dataset.id = id;
  tabs.append(tab);
}
function show(id, focus) {
  for (const [one] of TABS) {
    const on = one === id;
    $(`p-${one}`).hidden = !on;
    const tab = $(`t-${one}`);
    tab.setAttribute("aria-selected", String(on));
    tab.tabIndex = on ? 0 : -1;
    if (on && focus) tab.focus();
  }
  try { history.replaceState(null, "", `#${id}`); } catch { /* a page that may not change its address */ }
}
tabs.addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (tab) show(tab.dataset.id, false);
});
tabs.addEventListener("keydown", (event) => {
  const at = TABS.findIndex(([id]) => id === document.activeElement?.dataset?.id);
  const move = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
  if (at < 0 || move === undefined) return;
  event.preventDefault();
  show(TABS[(at + move + TABS.length) % TABS.length][0], true);
});
show(TABS.some(([id]) => `#${id}` === location.hash) ? location.hash.slice(1) : "tokens", false);

// Tokens.
const swatches = $("swatches");
for (const [name, value] of Object.entries(COLOURS)) {
  const swatch = document.createElement("div");
  swatch.className = "swatch";
  swatch.innerHTML = `<i style="background:${value}"></i><b>${name}</b><br>${value}`;
  swatches.append(swatch);
}
// Icons.
for (const name of ICON_NAMES) {
  const holder = $("icons");
  const button = document.createElement("kazoku-icon-button");
  button.setAttribute("icon", name);
  button.dataset.testid = `icon-${name}`;
  holder.append(button);
}
// The bars, the card, the panels.
const clock = createStandInClock({ speed: 3600 });
$("bar").clock = clock;
$("bar2").clock = clock;
$("bar").addEventListener("kazoku-control", (event) => report($("last"), event));
$("scale").addEventListener("kazoku-scalechange", (event) => report($("last"), event));
const data = jupiterCard(clock.time);
$("card").data = data;
$("layers").layers = LAYERS.map((item) => ({ ...item }));
$("layers").sources = sourcesFromCredits(CREDITS);
$("foot-view").sources = CREDITS;
$("foot-page").sources = CREDITS;
$("top").trail = [{ label: "Solar system", href: "interface.html" }, { label: { en: "Jupiter", ja: "木星" } }];

onLang(() => {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = SAY[lang()][el.dataset.say];
  for (const [id, words] of TABS) $(`t-${id}`).textContent = words[lang()];
  $("top").trail = [{ label: lang() === "ja" ? "太陽系" : "Solar system", href: "interface.html" }, { label: { en: "Jupiter", ja: "木星" } }];
});
