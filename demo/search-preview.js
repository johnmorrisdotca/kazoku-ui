// A search box whose rows carry an icon and a preview. The stars carry theirs (shown at once); planets, craft and cities are asked for with loadPreview, only when the reader highlights one.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import "./dist/page-frame/define.js";
import "./dist/search-box/define.js";
import { rank } from "./dist/search-box/index.js";

const box = document.querySelector("#pbox");
const slowButton = document.querySelector("#slowpv");
const failButton = document.querySelector("#failpv");
const out = { picked: document.querySelector("#picked"), calls: document.querySelector("#pcalls"), aborts: document.querySelector("#paborts"), last: document.querySelector("#plast") };

const table = (text) => text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => line.split("|").map((part) => part.trim()));
// [id, English, Japanese, colour or flag, fact, fact, fact]; a fact with a dot is English・Japanese
const KINDS = {
  stars: table(`
    sirius|Sirius|シリウス|#9db4ff|-1.46|Canis Major・おおいぬ座|8.6 ly・8.6光年
    vega|Vega|ベガ|#cad7ff|0.03|Lyra・こと座|25 ly・25光年
    arcturus|Arcturus|アークトゥルス|#ffcc8f|-0.05|Boötes・うしかい座|37 ly・37光年
    rigel|Rigel|リゲル|#aabfff|0.13|Orion・オリオン座|860 ly・860光年
    betelgeuse|Betelgeuse|ベテルギウス|#ffb56c|0.50|Orion・オリオン座|550 ly・550光年
    polaris|Polaris|ポラリス|#fff4ea|1.98|Ursa Minor・こぐま座|430 ly・430光年
    antares|Antares|アンタレス|#ff9d6c|1.06|Scorpius・さそり座|550 ly・550光年
    altair|Altair|アルタイル|#f2f4ff|0.77|Aquila・わし座|17 ly・17光年`),
  planets: table(`
    mercury|Mercury|水星|#9a9a9a|0|1408 h・1408時間|0.39 AU
    venus|Venus|金星|#e6c27a|0|5832 h・5832時間|0.72 AU
    earth|Earth|地球|#3d7bd9|1|24 h・24時間|1.00 AU
    mars|Mars|火星|#c1440e|2|24.6 h・24.6時間|1.52 AU
    jupiter|Jupiter|木星|#c99b6e|95|9.9 h・9.9時間|5.20 AU
    saturn|Saturn|土星|#dcc58b|146|10.7 h・10.7時間|9.58 AU
    uranus|Uranus|天王星|#8fd3d6|28|17.2 h・17.2時間|19.2 AU
    neptune|Neptune|海王星|#4a67d6|16|16.1 h・16.1時間|30.1 AU`),
  craft: table(`
    voyager1|Voyager 1|ボイジャー1号|#7a8a99|1977・1977年|NASA|—
    voyager2|Voyager 2|ボイジャー2号|#7a8a99|1977・1977年|NASA|—
    cassini|Cassini|カッシーニ|#7a8a99|1997・1997年|NASA, ESA|—
    hubble|Hubble Space Telescope|ハッブル宇宙望遠鏡|#7a8a99|1990・1990年|NASA, ESA|—
    juno|Juno|ジュノー|#7a8a99|2011・2011年|NASA|—
    hayabusa2|Hayabusa2|はやぶさ2|#7a8a99|2014・2014年|JAXA|—`),
  cities: table(`
    tokyo|Tokyo|東京|🇯🇵|Japan・日本|37 million・3,700万人|35.7°N・北緯35.7°
    osaka|Osaka|大阪|🇯🇵|Japan・日本|19 million・1,900万人|34.7°N・北緯34.7°
    kyoto|Kyoto|京都|🇯🇵|Japan・日本|1.5 million・150万人|35.0°N・北緯35.0°
    toronto|Toronto|トロント|🇨🇦|Canada・カナダ|6.3 million・630万人|43.7°N・北緯43.7°
    vancouver|Vancouver|バンクーバー|🇨🇦|Canada・カナダ|2.6 million・260万人|49.3°N・北緯49.3°
    paris|Paris|パリ|🇫🇷|France・フランス|11 million・1,100万人|48.9°N・北緯48.9°
    madrid|Madrid|マドリード|🇪🇸|Spain・スペイン|6.8 million・680万人|40.4°N・北緯40.4°
    nairobi|Nairobi|ナイロビ|🇰🇪|Kenya・ケニア|5.1 million・510万人|1.3°S・南緯1.3°`),
};
const LABELS = {
  en: { stars: "Stars", planets: "Planets", craft: "Craft", cities: "Cities", show: "Show", go: "Go", fav: "Favourite", kind: { stars: "Star", planets: "Planet", craft: "Craft", cities: "City" },
    facts: { stars: ["Magnitude", "Constellation", "Distance"], planets: ["Moons", "Day", "From the Sun"], craft: ["Launched", "Agency"], cities: ["Country", "People", "Latitude"] }, jupiter: "Jupiter, from the demo's own drawing", mars: "Mars drawn by the page" },
  ja: { stars: "星", planets: "惑星", craft: "宇宙機", cities: "都市", show: "表示", go: "移動", fav: "お気に入り", kind: { stars: "星", planets: "惑星", craft: "宇宙機", cities: "都市" },
    facts: { stars: ["等級", "星座", "距離"], planets: ["衛星", "1日", "太陽から"], craft: ["打ち上げ年", "運用機関"], cities: ["国", "人口", "緯度"] }, jupiter: "木星の絵（このデモの自前の図）", mars: "このページが描いた火星の図" },
};
// readings, so a reader can type kana for a name written in kanji
const KANA = { tokyo: "とうきょう", osaka: "おおさか", kyoto: "きょうと", mercury: "すいせい", venus: "きんせい", earth: "ちきゅう", mars: "かせい", jupiter: "もくせい", saturn: "どせい", uranus: "てんのうせい", neptune: "かいおうせい" };
const ACTIONS = { stars: ["show", "go", "fav"], planets: ["show", "go", "fav"], craft: ["go", "fav"], cities: ["go", "fav"] };
const CRAFT_PATH = ["M12 3.5l4.5 13-4.5-2.8-4.5 2.8z"];

const language = () => (document.documentElement.lang === "ja" ? "ja" : "en");
const favourites = new Set();
let calls = 0;
let aborts = 0;
const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const pick = (pair, lang) => (pair.includes("・") ? pair.split("・")[lang === "ja" ? 1 : 0] : pair);

const iconOf = (kind, mark) => (kind === "stars" ? { name: "star", color: mark } : kind === "planets" ? { name: "disc", color: mark } : kind === "craft" ? { path: CRAFT_PATH, color: mark } : { text: mark });
// The facts of a row, in the reader's language
const factsOf = (kind, line, lang) => LABELS[lang].facts[kind].map((label, i) => ({ label, value: pick(line[4 + i], lang) })).filter((fact) => fact.value !== "—");
const previewOf = (kind, line, lang) => {
  const preview = { kind: LABELS[lang].kind[kind], facts: factsOf(kind, line, lang) };
  if (line[0] === "jupiter") Object.assign(preview, { picture: "interface-jupiter.svg", pictureAlt: LABELS[lang].jupiter });
  if (line[0] === "mars") {
    const disc = document.createElement("span");
    // the node is drawn inside the box's own shadow tree, where the page's stylesheet does not reach: it carries its own look
    Object.assign(disc.style, { display: "block", width: "96px", height: "96px", borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #e8a077, #c1440e 55%, #5e1f05)" });
    disc.className = "disc";
    disc.setAttribute("role", "img");
    disc.setAttribute("aria-label", LABELS[lang].mars);
    preview.element = disc;
  }
  return preview;
};

// A search the page answers from its own lists. Stars carry their preview; the others do not.
box.source = (query, { group }) => {
  const lang = language();
  const words = LABELS[lang];
  return Object.entries(KINDS).map(([kind, list]) => {
    const found = list
      .map((line) => ({ line, score: rank(query, lang === "ja" ? line[2] : line[1], [line[1], line[2], ...(KANA[line[0]] ? [KANA[line[0]]] : [])]) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    const wanted = group === "" || group === kind;
    return {
      id: kind,
      label: words[kind],
      total: found.length,
      rows: !wanted ? [] : found.map(({ line }) => ({
        id: line[0],
        label: lang === "ja" ? line[2] : line[1],
        detail: words.kind[kind],
        icon: iconOf(kind, line[3]),
        ...(kind === "stars" ? { preview: previewOf(kind, line, lang) } : {}),
        actions: ACTIONS[kind].map((action) => (action === "fav" ? { id: "fav", label: words.fav, icon: "star", pressed: favourites.has(`${kind}:${line[0]}`) } : { id: action, label: words[action], icon: action === "show" ? "show" : "go" })),
      })),
    };
  }).filter((one) => one.total > 0);
};

// Asked for when a planet, craft or city is highlighted, and not before. It does not stop what it started on an abort, so a late answer comes back and the box must drop it.
box.loadPreview = async (row, { signal, group }) => {
  calls += 1;
  out.calls.textContent = String(calls);
  out.last.textContent = `${group}/${row.id}`;
  signal.addEventListener("abort", () => {
    aborts += 1;
    out.aborts.textContent = String(aborts);
  });
  await sleep(slowButton.getAttribute("aria-pressed") === "true" ? 900 : 20);
  if (failButton.getAttribute("aria-pressed") === "true") throw new Error("the preview failed");
  const line = KINDS[group]?.find((one) => one[0] === row.id);
  return line ? previewOf(group, line, language()) : undefined;
};

box.addEventListener("kazoku-search-pick", (event) => {
  const { id, group, action, pressed } = event.detail;
  if (action === "fav") {
    if (pressed) favourites.add(`${group}:${id}`);
    else favourites.delete(`${group}:${id}`);
  }
  out.picked.textContent = `${action} ${group}/${id}${pressed === undefined ? "" : pressed ? " on" : " off"}`;
});
for (const button of [slowButton, failButton]) button.addEventListener("click", () => button.setAttribute("aria-pressed", String(button.getAttribute("aria-pressed") !== "true")));

const SAY = {
  en: { title: "search preview", back: "The search box", intro: "Type a name, such as mar, a or to. Down or the pointer highlights a result and its preview appears beside the list; on a narrow screen press Details on a result. Stars carry their preview; the rest are asked for only when highlighted.", slowpv: "Slow previews", failpv: "Previews fail", pickedLabel: "Picked", callsLabel: "Preview calls", abortLabel: "Stopped", lastLabel: "Last" },
  ja: { title: "検索のプレビュー", back: "検索ボックス", intro: "mar、a、to のように名前を入力します。下キーで結果に移るか、結果にポインターを合わせると、リストの横にプレビューが表示されます。狭い画面では結果の「詳細」を押します。星は最初からプレビューを持ち、それ以外は選択したときにだけ取得します。", slowpv: "プレビューを遅くする", failpv: "プレビューを失敗させる", pickedLabel: "選んだもの", callsLabel: "プレビューの呼び出し", abortLabel: "中断", lastLabel: "直近" },
};
const show = () => {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = SAY[language()][el.dataset.say] ?? el.textContent;
  box.setAttribute("lang", language());
  // the same question again, in the new language
  const asked = box.value;
  if (asked.trim() !== "") box.value = asked;
};
document.getElementById("language").addEventListener("kazoku-languagechange", show);
show();
