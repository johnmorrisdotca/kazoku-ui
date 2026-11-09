// A sample printable sheet and a poster tiled over pages, built with buildSheet and printed with printSheet. The preview is the same DOM that is printed.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import { buildSheet, printCss, printSheet, tilePoster, wordsFor } from "./dist/print/index.js";

const $ = (id) => document.getElementById(id);
const SAY = {
  en: { title: "print layout", back: "The view controls", save: "Save as an image", intro: "A sample sheet: the header, the info box, the footer with a QR code of this page's address, and a poster cut over several pages. Pick a paper, then print it or save it as a PDF.", what: "Sheet", sheet: "One page", poster: "Poster, cut in pages", paper: "Paper", turn: "Turned", portrait: "Tall", landscape: "Wide", type: "Type", kid: "Big and round (children)", normal: "Normal", sheetTitle: "The planets", names: ["Mercury", "Venus", "Earth"], posterTitle: "Big planet poster", pages: "pages", package: "A sample package", credits: "Pictures and facts: public domain. Made with Kazoku UI.", region: "The Solar System", season: "All year", level: "Grades 1 to 6", language: "English", flagAlt: "A blue flag with a white circle", brand: "Space Program X", poster1: "Jupiter" },
  ja: { title: "いんさつの レイアウト", back: "ひょうじの そうさ", save: "がぞうとして ほぞん", intro: "サンプルの プリント: ヘッダー、じょうほうの はこ、この ページの アドレスの QRコードが ついた フッター、いくつかの ページに わけた ポスターです。かみを えらんで、いんさつするか PDFで ほぞんします。", what: "プリント", sheet: "1まい", poster: "ポスター (ページに わける)", paper: "かみ", turn: "むき", portrait: "たて", landscape: "よこ", type: "もじ", kid: "おおきくて まるい (こども)", normal: "ふつう", sheetTitle: "わくせい", names: ["すいせい", "きんせい", "ちきゅう"], posterTitle: "おおきな わくせいポスター", pages: "ページ", package: "サンプルの パッケージ", credits: "しゃしんと じょうほう: パブリックドメイン。Kazoku UIで つくりました。", region: "たいようけい", season: "いちねんじゅう", level: "1ねんせいから 6ねんせい", language: "にほんご", flagAlt: "あおい はたに しろい まる", brand: "Space Program X", poster1: "もくせい" },
};
const state = { what: "sheet", page: "a4", orientation: "portrait", type: "kid" };
const language = () => (document.documentElement.lang === "ja" ? "ja" : "en");
const say = (key) => SAY[language()][key];

// A flag that needs no file.
const FLAG = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="40" fill="#2457d6"/><circle cx="30" cy="20" r="10" fill="#fff"/></svg>');

const svg = (width, height, inner) => {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  el.setAttribute("viewBox", `0 0 ${width} ${height}`);
  el.setAttribute("width", "100%");
  el.setAttribute("height", "100%");
  el.innerHTML = inner;
  return el;
};

// A planet and its name: a ring as thin as the kid preset's lines (1.2 mm) and a large name, for the first page.
function body() {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:6mm;align-items:center;flex-wrap:wrap";
  for (const [name, fill] of say("names").map((one, i) => [one, ["#b7bcc8", "#e8c27a", "#4a86d8"][i]])) {
    const card = document.createElement("div");
    card.style.cssText = "text-align:center";
    const art = svg(100, 100, `<circle cx="50" cy="50" r="40" fill="${fill}" stroke="#000" stroke-width="3"/>`);
    art.style.width = "42mm";
    art.style.height = "42mm";
    const label = document.createElement("div");
    label.className = "kazoku-name";
    label.textContent = name;
    card.append(art, label);
    wrap.append(card);
  }
  return wrap;
}

// The poster: 400 × 300 mm, drawn in millimetres so it can be tiled.
function poster() {
  return svg(400, 300, `<rect x="4" y="4" width="392" height="292" rx="20" fill="#fff" stroke="#000" stroke-width="1.2"/><circle cx="200" cy="150" r="110" fill="#e8c27a" stroke="#000" stroke-width="1.2"/><circle cx="200" cy="150" r="70" fill="none" stroke="#000" stroke-width="1.2"/><text x="200" y="165" text-anchor="middle" font-size="40" font-weight="800" font-family="system-ui, sans-serif">${say("poster1")}</text>`);
}

function options() {
  const base = { page: state.page, orientation: state.orientation, type: state.type, language: language(), brand: say("brand"), packageName: say("package"), credits: say("credits"), version: "demo", date: new Date(), address: location.href.split("#")[0] };
  if (state.what === "poster") return { ...base, title: say("posterTitle"), poster: { content: poster(), widthMm: 400, heightMm: 300 } };
  return { ...base, title: say("sheetTitle"), pages: [body()], info: { region: say("region"), flagSrc: FLAG, flagAlt: say("flagAlt"), latitudeBand: "0° – 90°", season: say("season"), level: say("level"), language: say("language") } };
}

let sheet;
function fit() {
  const inner = $("paper-inner");
  inner.style.transform = "none";
  inner.style.width = "";
  const first = inner.querySelector(".kazoku-page");
  if (!first) return;
  const natural = first.getBoundingClientRect().width;
  const scale = Math.min(1, $("paper").clientWidth / natural);
  inner.style.width = `${natural}px`;
  inner.style.transform = `scale(${scale})`;
  $("paper").style.height = `${inner.scrollHeight * scale}px`;
}

function render() {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = say(el.dataset.say);
  $("print").textContent = wordsFor(language()).button;
  for (const group of document.querySelectorAll("[data-group]")) for (const pill of group.querySelectorAll("button")) pill.setAttribute("aria-pressed", String(state[group.dataset.group] === pill.dataset.value));
  const next = options();
  let style = $("print-preview-style");
  if (!style) {
    style = document.createElement("style");
    style.id = "print-preview-style";
    document.head.append(style);
  }
  style.textContent = printCss(next);
  sheet = buildSheet(next);
  $("paper-inner").replaceChildren(sheet);
  const pages = sheet.querySelectorAll(".kazoku-page").length;
  const plan = tilePoster({ widthMm: 400, heightMm: 300, page: state.page, orientation: state.orientation });
  $("info").textContent = `${pages} ${say("pages")}${state.what === "poster" ? ` (${plan.columns} × ${plan.rows})` : ""}`;
  fit();
}

for (const group of document.querySelectorAll("[data-group]")) group.addEventListener("click", (event) => {
  const pill = event.target.closest("button");
  if (!pill) return;
  state[group.dataset.group] = pill.dataset.value;
  render();
});
$("print").addEventListener("click", () => printSheet(sheet));
document.addEventListener("kazoku-languagechange", render);
window.addEventListener("resize", fit);
render();
