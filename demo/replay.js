// The replay bar reports play, pause, start and repeat. This page keeps a place and moves it; the bar does not.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import "./dist/replay-bar/define.js";

const $ = (id) => document.getElementById(id);
const SAY = {
  en: { title: "replay bar", back: "The view controls", speed: "Speed buttons", intro: "Play, pause, back to the start and repeat, with the family's speed buttons on the same row. The bar reports the choice. The page moves the thing.", playing: "Playing", paused: "Paused", at: "at" },
  ja: { title: "リプレイバー", back: "表示の操作", speed: "速さのボタン", intro: "「再生」「一時停止」「最初へ」「繰り返し」を、ファミリーの速さのボタンと同じ行に置きます。バーは選んだことを伝え、ものを動かすのはページです。", playing: "再生中", paused: "一時停止中", at: "位置" },
};
const say = (key) => SAY[document.documentElement.lang === "ja" ? "ja" : "en"][key];
const bar = $("bar");
let place = 0;
let speed = 1;
let last = 0;

function words() {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = say(el.dataset.say);
  bar.setAttribute("lang", document.documentElement.lang);
  show();
}
function show() {
  $("out").textContent = `${bar.playing ? say("playing") : say("paused")}, ${say("at")} ${place.toFixed(1)}`;
}
function tick(now) {
  if (bar.playing) {
    const step = Math.min(2, last ? (now - last) / 1000 : 0);
    place += step * speed;
    if (place >= 10) place = bar.repeat ? 0 : 10;
    if (!bar.playing || place >= 10) place = Math.min(place, 10);
    show();
  }
  last = now;
  requestAnimationFrame(tick);
}
bar.addEventListener("kazoku-replay", (event) => {
  if (event.detail.action === "start") place = 0;
  show();
});
bar.addEventListener("kazoku-speedchange", (event) => { speed = event.detail.value; });
new globalThis.MutationObserver(words).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
words();
requestAnimationFrame(tick);
