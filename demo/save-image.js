// Save buttons for a canvas, an SVG and an element. The picture each one makes comes back in the `kazoku-save` event, and is shown under them.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import "./dist/save-image/define.js";

const $ = (id) => document.getElementById(id);
const SAY = {
  en: { title: "save as an image", back: "The view controls", address: "Choices kept in the address", intro: "Each button saves what its picture shows: a canvas, an SVG and a piece of the page. The SVG can be saved as SVG too.", canvas: "A canvas", svg: "An SVG", element: "A piece of the page", sheetTitle: "Match day", sheetText: "Kazoku Rovers against the Visitors, Saturday at seven.", none: "Nothing saved yet.", saved: "Saved", failed: "Could not save" },
  ja: { title: "画像として保存", back: "表示の操作", address: "アドレスに残す選択", intro: "ボタンを押すと、その絵に見えているものを保存します。キャンバス、SVG、ページの一部です。SVGはSVGのままでも保存できます。", canvas: "キャンバス", svg: "SVG", element: "ページの一部", sheetTitle: "試合の日", sheetText: "カゾク・ローバーズ対ビジターズ、土曜日の7時。", none: "まだ保存していません。", saved: "保存しました", failed: "保存できませんでした" },
};
const say = (key) => SAY[document.documentElement.lang === "ja" ? "ja" : "en"][key];
let last;

function words() {
  for (const el of document.querySelectorAll("[data-say]")) if (el !== $("result") || last === undefined) el.textContent = say(el.dataset.say);
  for (const saver of document.querySelectorAll("kazoku-save-image")) saver.setAttribute("lang", document.documentElement.lang);
}

// A drawing that needs no files: a gradient, a ring and a mark.
function draw() {
  const canvas = $("canvas");
  const dark = window.getComputedStyle(document.documentElement).colorScheme.includes("dark") && matchMedia("(prefers-color-scheme: dark)").matches;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#2457d6");
  gradient.addColorStop(1, dark ? "#8fb0ff" : "#7fa2ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(180, 100, 56, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#1b1b1f";
  ctx.beginPath();
  ctx.moveTo(180, 62);
  ctx.lineTo(214, 124);
  ctx.lineTo(146, 124);
  ctx.closePath();
  ctx.fill();
}
draw();

document.addEventListener("kazoku-save", (event) => {
  const { blob, format, width, height, filename } = event.detail;
  if (last !== undefined) window.URL.revokeObjectURL(last);
  last = window.URL.createObjectURL(blob);
  $("preview").src = last;
  $("preview").hidden = false;
  $("result").textContent = `${say("saved")}: ${filename}, ${format.toUpperCase()}, ${width} × ${height}, ${(blob.size / 1024).toFixed(1)} KB`;
  $("result").dataset.format = format;
});
document.addEventListener("kazoku-saveerror", (event) => {
  $("result").textContent = `${say("failed")}: ${event.detail.error.message}`;
  $("result").dataset.format = "error";
});
document.addEventListener("kazoku-languagechange", words);
words();
