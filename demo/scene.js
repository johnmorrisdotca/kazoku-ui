// One scene, one camera and one clock from four layers, on the shared renderer's one WebGL context. The layers are stand-ins (scene-layers.js); the host glue is the package's own `composeScene`.
import * as THREE from "three";
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import "./dist/view-controls/define.js";
import "./dist/replay-bar/define.js";
import { createFamilyClock, clockAddress, readClockAddress } from "./dist/clock/index.js";
import { applyParams } from "./dist/address-state/address.js";
import { createSharedRenderer } from "./dist/renderer/index.js";
import { composeScene } from "./dist/scene/index.js";
import { earthLayer, moonLayer, satelliteLayer, starLayer, EARTH_KM, ORBIT_KM } from "./scene-layers.js";

const $ = (id) => document.getElementById(id);
const SAY = {
  en: { title: "shared scene", intro: "One scene, one camera and one clock from four layers: a sphere at the Earth's size, one at the Moon's distance, a satellite 400 km up and the stars. Drag to turn, pick what to look at, and set the date, the speed and Play. One WebGL context draws all of it, and nothing is drawn while it is paused.", earth: "Earth", moon: "Moon", satellite: "Satellite", focus: "Look at", date: "Date and time (UTC)", running: "running", paused: "paused", speed: "speed", slices: "depth slices", contexts: "contexts", draws: "draws", frames: "frames asked", view: "The shared scene" },
  ja: { title: "共有シーン", intro: "4つのレイヤーから、1つのシーン、1つのカメラ、1つの時計をつくります。地球の大きさの球、月の距離にある球、高度400 kmの人工衛星、そして星です。ドラッグで回し、見る対象を選び、日時と速さと再生を決めます。すべてを描くWebGLコンテキストは1つだけで、一時停止中は何も描きません。", earth: "地球", moon: "月", satellite: "人工衛星", focus: "見る対象", date: "日時（UTC）", running: "再生中", paused: "一時停止中", speed: "速さ", slices: "奥行きの層", contexts: "コンテキスト", draws: "描画", frames: "フレーム要求", view: "共有シーン" },
};
const say = (key) => SAY[document.documentElement.lang === "ja" ? "ja" : "en"][key];

const renderer = createSharedRenderer({ load: () => Promise.resolve(THREE) });
const layers = [starLayer(), earthLayer(), moonLayer(), satelliteLayer()];
// A link that names a time, a speed or a pause is obeyed; reduced motion opens paused with Play ready; otherwise it opens moving, at the focused body's speed.
const clock = createFamilyClock(readClockAddress(location.search));
const scene = composeScene(THREE, { layers, clock, focus: new URLSearchParams(location.search).get("focus") ?? "earth" });

const host = $("host");
const controls = $("controls");
const bar = $("bar");
const view = renderer.view(host, scene);
scene.bind(view);

function apply(state) {
  scene.camera.look(state);
}
controls.addEventListener("kazoku-viewchange", (event) => apply(event.detail));

async function focusOn(id) {
  scene.camera.focusOn(id);
  for (const button of document.querySelectorAll("[data-focus]")) button.setAttribute("aria-pressed", String(button.dataset.focus === id));
  controls.front();
  controls.fit();
  apply(controls.state);
  syncBar();
}
for (const button of document.querySelectorAll("[data-focus]")) button.addEventListener("click", () => focusOn(button.dataset.focus));

// The replay bar and its speed buttons drive the clock; only the reader's own presses (reason "user") count as the reader's choice.
bar.addEventListener("kazoku-replay", (event) => {
  if (event.detail.reason !== "user") return;
  if (event.detail.action === "play") clock.play();
  else if (event.detail.action === "pause") clock.pause();
  else if (event.detail.action === "start") clock.set(startMs);
});
bar.addEventListener("kazoku-speedchange", (event) => {
  if (event.detail.reason === "user") clock.setSpeed(event.detail.value);
});
const startMs = clock.time;
function syncBar() {
  if (bar.playing !== clock.running) bar.playing = clock.running;
  if (String(bar.getAttribute("speed")) !== String(clock.speed)) bar.setAttribute("speed", String(clock.speed));
}

const date = $("date");
const clockLine = $("clock-line");
function showClock() {
  const when = new Date(clock.time);
  date.textContent = Number.isFinite(when.getTime()) ? `${when.toISOString().slice(0, 19).replace("T", " ")} UTC` : "";
  clockLine.textContent = `${clock.running ? say("running") : say("paused")}${document.documentElement.lang === "ja" ? "、" : ", "}${say("speed")} ${clock.speed}×`;
}
// The readout follows the clock's own changes (a tick at most four times a second while it runs), and the address keeps where it is.
clock.onChange((change) => {
  showClock();
  if (change.reason !== "tick") {
    syncBar();
    history.replaceState(null, "", `${location.pathname}${applyParams(location.search, clockAddress(clock))}${location.hash}`);
  }
});

const stats = $("stats");
function showStats() {
  const s = renderer.stats;
  const slices = scene.stats.slices.map((slice) => slice.ids.join("+")).join(" | ");
  const rows = [[say("contexts"), s.contexts], [say("draws"), s.draws], [say("frames"), s.frames.requests], [say("slices"), slices || "-"]];
  stats.replaceChildren(...rows.map(([name, value]) => Object.assign(document.createElement("li"), { textContent: `${name} ${value}` })));
}
setInterval(showStats, 500);

function words() {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = say(el.dataset.say);
  host.setAttribute("aria-label", say("view"));
  bar.setAttribute("lang", document.documentElement.lang);
  const credits = document.querySelector("kazoku-page-credits");
  const own = scene.credits();
  credits?.setAttribute("credits", ["Kazoku UI is MIT-licensed, by John Morris.", ...own.map((c) => c.text), "The 3D drawing uses three.js (MIT licence)."].join(" "));
  credits?.setAttribute("credits-ja", ["Kazoku UIは、John MorrisによるMITライセンスのパッケージです。", ...own.map((c) => c.textJa ?? c.text), "3Dの描画にはthree.js（MITライセンス）を使っています。"].join(""));
  showClock();
  showStats();
}
new globalThis.MutationObserver(words).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

view.focus().then(() => {
  controls.view = host;
  focusOn(scene.camera.state.focus);
  words();
});
words();

window.kazokuDemo = { renderer, scene, clock, view, controls, layers, bar, focusOn, EARTH_KM, ORBIT_KM, showStats };
