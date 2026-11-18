// The time scrubber on its own and inside the replay bar. The page keeps a date; the scrubber only reports the one the reader chose.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import "./dist/replay-bar/define.js";
import "./dist/time-scrubber/define.js";

const $ = (id) => document.getElementById(id);
const SAY = {
  en: { title: "time scrubber", back: "The replay bar", speed: "Speed buttons", intro: "Drag, or use the arrow keys. Year, Month and Day change how far one step goes and how much of the track you drag over. The page decides what a date means.", at: "Showing", by: "by" },
  ja: { title: "時間スクラバー", back: "リプレイバー", speed: "速さのボタン", intro: "ドラッグするか、矢印キーで動かします。「年」「月」「日」で、1回の移動量と、トラックでドラッグする範囲が変わります。日付の意味を決めるのはページです。", at: "表示中", by: "刻み" },
};
const say = (key) => SAY[document.documentElement.lang === "ja" ? "ja" : "en"][key];
const last = { out: null, "bar-out": null };

function show(id, detail) {
  last[id] = detail ?? last[id];
  if (last[id]) $(id).textContent = `${say("at")} ${last[id].date} (${say("by")} ${last[id].scale})`;
}
function words() {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = say(el.dataset.say);
  for (const id of ["scrub", "bar"]) $(id).setAttribute("lang", document.documentElement.lang);
  show("out");
  show("bar-out");
}
$("scrub").addEventListener("kazoku-timechange", (event) => show("out", event.detail));
$("bar").addEventListener("kazoku-timechange", (event) => show("bar-out", event.detail));
new globalThis.MutationObserver(words).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
words();
