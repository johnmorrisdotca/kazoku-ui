// The builder: choose a part, set its options, see it live and copy the code. Every choice is kept in the address, so a link opens the same setup.
import { createAddressState } from "./dist/address-state/index.js";
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import "./dist/view-controls/define.js";
import "./dist/save-image/define.js";

const $ = (id) => document.getElementById(id);
const SAY = {
  en: { sub: "builder", back: "The view controls", layouts: "Layouts", address: "Choices kept in the address", intro: "Choose a part, set it, see it, and copy the code. Every choice is kept in the address, so a link opens the same setup.", part: "Part", preview: "Preview", options: "Options", code: "The code", copy: "Copy", copied: "Copied", viewControls: "View controls", themeSwitch: "Theme switch", languagePicker: "Language picker", saveImage: "Save image", on: "On", off: "Off", page: "The page's", english: "English", japanese: "Japanese", scene: "Your scene", layout: "Layout", level: "Controls", range: "Zoom range", colours: "Colours", language: "Language", address_: "Address", autoplay: "Autoplay", flat: "Flat", modes: "Buttons", all: "All three", twoModes: "Light and dark", storage: "Remember", languages: "Languages", formats: "Formats", scale: "Scale", name: "File name", target: "Target", canvas: "A canvas", svg: "An SVG", background: "Background", lightWord: "Light", darkWord: "Dark" },
  ja: { sub: "ビルダー", back: "表示の操作", layouts: "レイアウト", address: "アドレスに残す選択", intro: "部品を選んで設定し、表示を確かめて、コードをコピーできます。選んだ内容はアドレスに残るので、リンクを開くと同じ設定になります。", part: "部品", preview: "プレビュー", options: "設定", code: "コード", copy: "コピー", copied: "コピーしました", viewControls: "表示の操作", themeSwitch: "テーマの切り替え", languagePicker: "言語の選択", saveImage: "画像の保存", on: "あり", off: "なし", page: "ページに合わせる", english: "英語", japanese: "日本語", scene: "表示するシーン", layout: "レイアウト", level: "操作のレベル", range: "ズームの範囲", colours: "配色", language: "言語", address_: "アドレス", autoplay: "自動回転", flat: "平面", modes: "ボタン", all: "3つとも", twoModes: "ライトとダーク", storage: "記憶する", languages: "言語の一覧", formats: "形式", scale: "倍率", name: "ファイル名", target: "対象", canvas: "キャンバス", svg: "SVG", background: "背景", lightWord: "ライト", darkWord: "ダーク" },
};
const lang = () => (document.documentElement.lang === "ja" ? "ja" : "en");
const say = (key) => SAY[lang()][key] ?? key;

// A setting: a key, its label, the choices as [value, word] (a word is a key of SAY, or text), its default, and how it is written as an attribute (null leaves it out).
const PARTS = {
  "view-controls": {
    label: "viewControls", tag: "kazoku-view-controls", define: "view-controls/define",
    settings: [
      { key: "layout", label: "layout", options: [["classic", "classic"], ["horizontal", "horizontal"], ["vertical", "vertical"], ["compact", "compact"]], value: "classic", attr: (v) => (v === "classic" ? null : ["layout", v]) },
      { key: "level", label: "level", options: [["basic", "basic"], ["advanced", "advanced"]], value: "basic", attr: (v) => (v === "basic" ? null : ["controls", v]) },
      { key: "range", label: "range", options: [["1-5", "1× – 5×"], ["0.5-4", "0.5× – 4×"], ["1-10", "1× – 10×"]], value: "1-5", attr: (v) => (v === "1-5" ? null : ["zoom-min", v.split("-")[0]]), attr2: (v) => (v === "1-5" ? null : ["zoom-max", v.split("-")[1]]) },
      { key: "autoplay", label: "autoplay", options: [["off", "off"], ["on", "on"]], value: "off", attr: (v) => (v === "on" ? ["autoplay", ""] : null) },
      { key: "flat", label: "flat", options: [["off", "off"], ["on", "on"]], value: "off", attr: (v) => (v === "on" ? ["flat", ""] : null) },
      { key: "address", label: "address_", options: [["off", "off"], ["on", "on"]], value: "off", attr: (v) => (v === "on" ? ["address", ""] : null) },
      { key: "colours", label: "colours", options: [["", "page"], ["light", "lightWord"], ["dark", "darkWord"]], value: "", attr: (v) => (v ? ["theme", v] : null) },
      { key: "lang", label: "language", options: [["en", "english"], ["ja", "japanese"]], value: "en", attr: (v) => (v === "en" ? null : ["lang", v]) },
    ],
  },
  "theme-switch": {
    label: "themeSwitch", tag: "kazoku-theme-switch", define: "theme-switch/define",
    settings: [
      { key: "modes", label: "modes", options: [["all", "all"], ["two", "twoModes"]], value: "all", attr: (v) => (v === "two" ? ["modes", "light dark"] : null) },
      { key: "address", label: "address_", options: [["on", "on"], ["off", "off"]], value: "on", attr: (v) => (v === "on" ? ["address", ""] : null) },
      { key: "storage", label: "storage", options: [["on", "on"], ["off", "off"]], value: "off", attr: (v) => (v === "on" ? ["storage", ""] : null) },
      { key: "lang", label: "language", options: [["en", "english"], ["ja", "japanese"]], value: "en", attr: (v) => (v === "en" ? null : ["lang", v]) },
    ],
  },
  "language-picker": {
    label: "languagePicker", tag: "kazoku-language-picker", define: "language-picker/define",
    settings: [
      { key: "languages", label: "languages", options: [["en ja", "en ja"], ["en ja fr", "en ja fr"], ["en fr", "en fr"]], value: "en ja", attr: (v) => ["languages", v] },
      { key: "address", label: "address_", options: [["on", "on"], ["off", "off"]], value: "on", attr: (v) => (v === "on" ? ["address", ""] : null) },
      { key: "storage", label: "storage", options: [["on", "on"], ["off", "off"]], value: "off", attr: (v) => (v === "on" ? ["storage", ""] : null) },
    ],
  },
  "save-image": {
    label: "saveImage", tag: "kazoku-save-image", define: "save-image/define",
    settings: [
      { key: "target", label: "target", options: [["canvas", "canvas"], ["svg", "svg"]], value: "canvas", attr: () => ["for", "art"] },
      { key: "formats", label: "formats", options: [["png svg", "png svg"], ["png", "png"], ["svg", "svg"]], value: "png svg", attr: (v) => (v === "png svg" ? null : ["formats", v]) },
      { key: "scale", label: "scale", options: [["1", "1×"], ["2", "2×"], ["3", "3×"]], value: "2", attr: (v) => (v === "2" ? null : ["scale", v]) },
      { key: "background", label: "background", options: [["", "off"], ["#ffffff", "#ffffff"]], value: "", attr: (v) => (v ? ["background", v] : null) },
      { key: "name", label: "name", options: [["image", "image"], ["my-picture", "my-picture"]], value: "image", attr: (v) => (v === "image" ? null : ["name", v]) },
    ],
  },
};

const defaults = { part: "view-controls" };
for (const part of Object.values(PARTS)) for (const s of part.settings) defaults[`${part.tag}.${s.key}`] = s.value;
const address = createAddressState({ defaults, delay: 0 });
const part = () => PARTS[address.get("part")] ?? PARTS["view-controls"];
const valueOf = (setting) => address.get(`${part().tag}.${setting.key}`) ?? setting.value;
const wordOf = (word) => (word in SAY.en ? say(word) : word);

function attributesOf() {
  const list = [];
  for (const s of part().settings) for (const make of [s.attr, s.attr2]) {
    const pair = make?.(valueOf(s));
    if (pair) list.push(pair);
  }
  return list;
}
const attrText = (list) => list.map(([k, v]) => (v === "" ? k : `${k}="${v}"`)).join(" ");

function drawParts() {
  $("parts").replaceChildren(...Object.entries(PARTS).map(([key, p]) => {
    const button = document.createElement("button");
    button.className = "pill";
    button.type = "button";
    button.dataset.part = key;
    button.textContent = say(p.label);
    button.setAttribute("aria-pressed", String(part() === p));
    button.addEventListener("click", () => address.set("part", key));
    return button;
  }));
}
function drawOptions() {
  $("options").replaceChildren(...part().settings.map((s) => {
    const row = document.createElement("div");
    row.className = "row";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = say(s.label);
    const seg = document.createElement("div");
    seg.className = "seg";
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", say(s.label));
    seg.dataset.key = s.key;
    seg.replaceChildren(...s.options.map(([value, word]) => {
      const button = document.createElement("button");
      button.className = "pill";
      button.type = "button";
      button.dataset.value = value;
      button.textContent = wordOf(word);
      button.setAttribute("aria-pressed", String(valueOf(s) === value));
      button.addEventListener("click", () => address.set(`${part().tag}.${s.key}`, value));
      return button;
    }));
    row.append(name, seg);
    return row;
  }));
}

const ART = `<svg id="art" viewBox="0 0 150 210" width="150" height="210" role="img" aria-label="A card"><rect x="2" y="2" width="146" height="206" rx="12" fill="#2457d6" stroke="#1b1b1f" stroke-width="4"/><circle cx="75" cy="86" r="42" fill="#fff"/><path d="M75 52l36 62H39z" fill="#1b1b1f"/></svg>`;
function drawStage() {
  const stage = $("stage");
  const p = part();
  const tag = document.createElement(p.tag);
  for (const [k, v] of attributesOf()) if (k !== "address" && k !== "storage") tag.setAttribute(k, v);
  // A preview of the theme switch or the language picker writes on the stage, not on this page.
  if (p.tag === "kazoku-theme-switch" || p.tag === "kazoku-language-picker") tag.setAttribute("target", "#stage");
  if (p.tag === "kazoku-view-controls") {
    const scene = document.createElement("div");
    scene.id = "scene";
    scene.tabIndex = 0;
    scene.className = "scene small";
    scene.setAttribute("role", "group");
    scene.setAttribute("aria-label", say("scene"));
    scene.innerHTML = `<div class="zoomer"><div class="grid"></div><div class="persp"><div class="card"><div class="face front">${ART}</div><div class="face back"></div></div></div></div>`;
    tag.setAttribute("for", "scene");
    const card = scene.querySelector(".card");
    const zoomer = scene.querySelector(".zoomer");
    tag.addEventListener("kazoku-viewchange", ({ detail: s }) => {
      card.style.transform = `rotateX(${s.tilt}deg) rotateY(${s.yaw}deg)`;
      zoomer.style.transform = s.zoom === 1 && s.panX === 0 && s.panY === 0 ? "" : `translate(${s.panX}px, ${s.panY}px) scale(${s.zoom})`;
    });
    stage.replaceChildren(scene, tag);
  } else if (p.tag === "kazoku-save-image") {
    const target = valueOf(p.settings[0]);
    const holder = document.createElement("div");
    if (target === "canvas") {
      holder.innerHTML = `<canvas id="art" width="300" height="180" role="img" aria-label="A canvas"></canvas>`;
      const ctx = holder.firstChild.getContext("2d");
      ctx.fillStyle = "#2457d6";
      ctx.fillRect(0, 0, 300, 180);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(150, 90, 50, 0, Math.PI * 2);
      ctx.fill();
    } else holder.innerHTML = ART;
    stage.replaceChildren(holder, tag);
  } else stage.replaceChildren(tag);
}
function drawCode() {
  const p = part();
  const attrs = attributesOf();
  const open = `<${p.tag}${attrs.length ? ` ${attrText(attrs)}` : ""}></${p.tag}>`;
  const scene = p.tag === "kazoku-view-controls" ? `<div id="scene" tabindex="0">…your scene…</div>\n` : p.tag === "kazoku-save-image" ? (valueOf(p.settings[0]) === "canvas" ? `<canvas id="art" width="300" height="180"></canvas>\n` : `<svg id="art" viewBox="0 0 150 210">…</svg>\n`) : "";
  const withFor = p.tag === "kazoku-view-controls" ? open.replace(`<${p.tag}`, `<${p.tag} for="scene"`) : open;
  const listen = p.tag === "kazoku-view-controls" ? `\n  document.querySelector("${p.tag}").addEventListener("kazoku-viewchange", (event) => draw(event.detail));` : p.tag === "kazoku-theme-switch" ? `\n  document.addEventListener("kazoku-themechange", ({ detail }) => console.log(detail.choice));` : p.tag === "kazoku-language-picker" ? `\n  document.addEventListener("kazoku-languagechange", ({ detail }) => say(detail.lang));` : "";
  $("code").textContent = `${scene}${withFor}\n<script type="module">\n  import "@johnmorrisdotca/kazoku-ui/${p.define}";${listen}\n</script>`;
}
function words() {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = say(el.dataset.say);
  document.querySelector(".copy").textContent = say("copy");
  drawParts();
  drawOptions();
}
function everything() {
  drawParts();
  drawOptions();
  drawStage();
  drawCode();
}
$("copy").addEventListener("click", async () => {
  const text = $("code").textContent ?? "";
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const range = document.createRange();
    range.selectNodeContents($("code"));
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  }
  $("copy").textContent = say("copied");
  window.setTimeout(() => ($("copy").textContent = say("copy")), 1500);
});
address.subscribe(() => everything());
new window.MutationObserver(() => { words(); everything(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
words();
everything();
