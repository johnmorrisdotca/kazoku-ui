// The wide layout: <kazoku-wide-toggle> writes data-wide="on" on <html>, wideCss() lays the stage out, and the view draws again at its new size when the toggle sends the window's resize.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import "./dist/wide-layout/define.js";
import { wideCss } from "./dist/wide-layout/index.js";

const $ = (id) => document.getElementById(id);
const SAY = {
  en: { title: "wide layout", back: "The view controls", intro: "The Wide button, or the T key, gives the view the page's whole width and moves the side panel below it. Normal puts it back. The choice is kept in the address (?wide=on) and on this device.", size: "Size", drawn: "Drawn", notes: "Notes", note: "The panel is a column beside the view, and a row of boxes below it in Wide. On a phone it is always below.", px: "pixels" },
  ja: { title: "ワイド表示", back: "表示の操作", intro: "ワイドのボタンか T キーで、ビューがページの幅いっぱいになり、横のパネルがその下に移ります。標準に戻すと元の形です。選びは、アドレス（?wide=on）とこの端末に残ります。", size: "大きさ", drawn: "描いた大きさ", notes: "メモ", note: "パネルは、ふつうはビューの横に縦に並び、ワイドではビューの下に横に並びます。スマホでは、いつも下です。", px: "ピクセル" },
};
const language = () => (document.documentElement.lang === "ja" ? "ja" : "en");

const style = document.createElement("style");
style.textContent = wideCss();
document.head.append(style);

// The picture is drawn at the view's size, inside the renderer's caps (4096 pixels a side, 6 million pixels), and again whenever the window says it resized.
const MAX_SIDE = 4096;
const MAX_PIXELS = 6e6;
const canvas = $("picture");
const ctx = canvas.getContext("2d");
let draws = 0;
function draw() {
  const view = $("view");
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  let w = Math.round(view.clientWidth * ratio);
  let h = Math.round(view.clientHeight * ratio);
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h), Math.sqrt(MAX_PIXELS / (w * h)));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));
  canvas.width = w;
  canvas.height = h;
  const look = window.getComputedStyle(document.documentElement);
  ctx.fillStyle = look.getPropertyValue("--surface") || "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = look.getPropertyValue("--accent") || "#2457d6";
  ctx.lineWidth = Math.max(2, w / 200);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - 2 * ctx.lineWidth, h - 2 * ctx.lineWidth);
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.35, 0, Math.PI * 2);
  ctx.stroke();
  draws += 1;
  $("size").textContent = `${view.clientWidth} × ${view.clientHeight} CSS ${SAY[language()].px}`;
  $("drawn").textContent = `${w} × ${h} (${draws})`;
  canvas.dataset.drawn = `${w}x${h}`;
}
window.addEventListener("resize", draw);

function say() {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = SAY[language()][el.dataset.say];
  draw();
}
$("language").addEventListener("kazoku-languagechange", (event) => {
  $("wide").setAttribute("lang", event.detail.lang);
  $("theme").setAttribute("lang", event.detail.lang);
  say();
});
say();
