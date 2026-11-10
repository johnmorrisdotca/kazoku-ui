// The parts over a stage that stands for a view. The page owns the clock and the data; each part reports what the reader did and this page applies it.
import { $, lang, onLang, report } from "./interface-demo.js";
import { createStandInClock } from "./dist/interface/clock-adapter.js";
import { sourcesFromCredits } from "./dist/interface/index.js";
import { CREDITS, jupiterCard, LAYERS, TRAIL, TRAIL_JA } from "./interface-data.js";

const SAY = {
  en: { title: "interface parts", back: "The view controls", parts: "Every part, one at a time", reading: "The reading page" },
  ja: { title: "インターフェースの部品", back: "表示の操作", parts: "部品を一つずつ", reading: "読むためのページ" },
};
const stage = $("stage");
const clock = createStandInClock({ speed: 3600 });
const bar = $("bar");
const layers = $("layers");
const card = $("card");
const last = $("last");
const off = new Set();
const data = jupiterCard(clock.time);
let layerItems = LAYERS.map((item) => ({ ...item }));

bar.clock = clock;
const syncSources = () => { layers.sources = sourcesFromCredits(CREDITS, (id) => !off.has(id)); };
layers.layers = layerItems;
syncSources();

onLang(() => {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = SAY[lang()][el.dataset.say];
  $("top").setAttribute("placeholder", lang() === "ja" ? "星、惑星、ロケットを検索" : "Search stars, planets, rockets");
  $("top").trail = lang() === "ja" ? TRAIL_JA : TRAIL;
  $("foot").sources = CREDITS;
});
card.data = data;
// The computed number moves with the clock, a few times a second at most, as the clock itself does.
clock.onChange((change) => {
  if (change.reason !== "tick") return;
  const sun = data.stats.find((stat) => stat.id === "sun");
  sun.value = jupiterCard(clock.time).stats[5].value;
  card.refreshValues();
});

for (const name of ["kazoku-control", "kazoku-scalechange", "kazoku-layerchange", "kazoku-cardclose", "kazoku-topbar"]) {
  stage.addEventListener(name, (event) => {
    report(last, event);
    if (name === "kazoku-control" && event.detail.action === "layers") {
      layers.hidden = !event.detail.value;
      stage.toggleAttribute("data-layers", event.detail.value);
    }
    if (name === "kazoku-layerchange" && event.detail.kind === "source") {
      if (event.detail.checked) off.delete(event.detail.id);
      else off.add(event.detail.id);
      $("foot").sources = CREDITS.filter((credit) => !off.has(credit.source.id));
    }
    if (name === "kazoku-layerchange" && event.detail.kind === "layer") layerItems = layerItems.map((item) => (item.id === event.detail.id ? { ...item, checked: event.detail.checked } : item));
  });
}
