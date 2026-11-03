// The speed buttons three ways: Auto-turn's 0.5×, 1×, 2×, a solar system's days a second, and a replay bar. Each tells the page its number in a `kazoku-speedchange` event.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import "./dist/speed-buttons/define.js";

const $ = (id) => document.getElementById(id);
const SAY = {
  en: { title: "speed buttons", back: "The view controls", layouts: "Layouts", intro: "One set of buttons for every speed in the family: Auto-turn's in the view controls, a solar system's days a second, a replay's. Press one; it stays on, goes in the address and in the element's value.", turn: "Auto-turn: 0.5×, 1×, 2×", days: "A solar system: days a second", replay: "A replay bar", daysLabel: "Days a second", replayLabel: "Replay speed", turnOut: "Turning at", daysOut: "Time runs at", replayOut: "Playing at", daysUnit: "days a second" },
  ja: { title: "速さのボタン", back: "表示の操作", layouts: "レイアウト", intro: "ファミリー全体で使う、速さのボタンです。自動回転、太陽系の「1秒あたりの日数」、リプレイで同じものを使います。押すと選んだ状態が残り、アドレスと要素のvalueにも入ります。", turn: "自動回転: 0.5×、1×、2×", days: "太陽系: 1秒あたりの日数", replay: "リプレイバー", daysLabel: "1秒あたりの日数", replayLabel: "リプレイの速さ", turnOut: "回転の速さ", daysOut: "時間の進み", replayOut: "再生の速さ", daysUnit: "日/秒" },
};
const say = (key) => SAY[document.documentElement.lang === "ja" ? "ja" : "en"][key];
const spin = $("spinner");

function words() {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = say(el.dataset.say);
  $("days-speed").setAttribute("label", say("daysLabel"));
  $("replay-speed").setAttribute("label", say("replayLabel"));
  for (const el of document.querySelectorAll("kazoku-speed-buttons")) el.setAttribute("lang", document.documentElement.lang);
  show();
}
function show() {
  $("turn-out").textContent = `${say("turnOut")} ${$("turn-speed").value}×`;
  $("days-out").textContent = `${say("daysOut")} ${$("days-speed").value} ${say("daysUnit")}`;
  $("replay-out").textContent = `${say("replayOut")} ${$("replay-speed").value}×`;
}
// The card turns once in 10 seconds at 1×; the number is only a multiple of that.
const turn = (value) => spin.style.setProperty("--turn", `${10 / value}s`);
$("turn-speed").addEventListener("kazoku-speedchange", ({ detail }) => { turn(detail.value); show(); });
for (const id of ["days-speed", "replay-speed"]) $(id).addEventListener("kazoku-speedchange", show);
new globalThis.MutationObserver(words).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
turn($("turn-speed").value);
words();
// Still until it is pointed at or tapped, as the family's demos are.
$("turner").addEventListener("click", () => $("turner").classList.toggle("on"));
