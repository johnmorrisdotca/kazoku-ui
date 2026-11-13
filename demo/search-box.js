// A fake source for the search box: five kinds of thing, a list long enough to page through, and a switch that makes every answer slow.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import "./dist/page-frame/define.js";
import "./dist/search-box/define.js";
import { rank } from "./dist/search-box/index.js";

const box = document.querySelector("#box");
const slowButton = document.querySelector("#slow");
const out = { picked: document.querySelector("#picked"), favs: document.querySelector("#favs"), calls: document.querySelector("#calls"), answered: document.querySelector("#answered"), last: document.querySelector("#last") };

const pairs = (text) => text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => line.split("|").map((part) => part.trim()));
// [id, English, Japanese, aliases...]
const KINDS = {
  stars: pairs(`
    sirius|Sirius|シリウス|dog star
    vega|Vega|ベガ|alpha lyrae
    arcturus|Arcturus|アークトゥルス
    rigel|Rigel|リゲル
    betelgeuse|Betelgeuse|ベテルギウス
    altair|Altair|アルタイル
    deneb|Deneb|デネブ
    polaris|Polaris|ポラリス|north star
    antares|Antares|アンタレス
    spica|Spica|スピカ
    capella|Capella|カペラ
    procyon|Procyon|プロキオン
    aldebaran|Aldebaran|アルデバラン
    regulus|Regulus|レグルス
    marfik|Marfik|マルフィク
    mizar|Mizar|ミザール
    algol|Algol|アルゴル|demon star
    mira|Mira|ミラ
    fomalhaut|Fomalhaut|フォーマルハウト
    canopus|Canopus|カノープス`),
  planets: pairs(`
    mercury|Mercury|水星
    venus|Venus|金星
    earth|Earth|地球|blue planet
    mars|Mars|火星|red planet
    jupiter|Jupiter|木星
    saturn|Saturn|土星
    uranus|Uranus|天王星
    neptune|Neptune|海王星
    moon|Moon|月|luna
    phobos|Phobos|フォボス
    deimos|Deimos|ダイモス
    europa|Europa|エウロパ
    titan|Titan|タイタン
    triton|Triton|トリトン
    pluto|Pluto|冥王星
    ceres|Ceres|ケレス`),
  craft: pairs(`
    pathfinder|Mars Pathfinder|マーズ・パスファインダー
    odyssey|Mars Odyssey|マーズ・オデッセイ
    express|Mars Express|マーズ・エクスプレス
    mro|Mars Reconnaissance Orbiter|マーズ・リコネサンス・オービター
    mariner4|Mariner 4|マリナー4号
    voyager1|Voyager 1|ボイジャー1号
    voyager2|Voyager 2|ボイジャー2号
    viking1|Viking 1|バイキング1号
    cassini|Cassini|カッシーニ
    juno|Juno|ジュノー
    hubble|Hubble Space Telescope|ハッブル宇宙望遠鏡
    apollo11|Apollo 11|アポロ11号
    hayabusa|Hayabusa|はやぶさ
    hayabusa2|Hayabusa2|はやぶさ2`),
  places: pairs(`
    olympus|Olympus Mons|オリンポス山
    valles|Valles Marineris|マリネリス峡谷
    gale|Gale Crater|ゲイルクレーター
    jezero|Jezero Crater|ジェゼロクレーター
    tycho|Tycho|ティコ
    copernicus|Copernicus|コペルニクス
    tranquility|Mare Tranquillitatis|静かの海
    imbrium|Mare Imbrium|雨の海
    marius|Marius Hills|マリウス丘`),
  cities: pairs(`
    tokyo|Tokyo|東京
    osaka|Osaka|大阪
    kyoto|Kyoto|京都
    nagoya|Nagoya|名古屋
    sapporo|Sapporo|札幌
    fukuoka|Fukuoka|福岡
    sendai|Sendai|仙台
    hiroshima|Hiroshima|広島
    nara|Nara|奈良
    kobe|Kobe|神戸
    yokohama|Yokohama|横浜
    kanazawa|Kanazawa|金沢
    nagasaki|Nagasaki|長崎
    kagoshima|Kagoshima|鹿児島
    naha|Naha|那覇
    marseille|Marseille|マルセイユ
    marrakesh|Marrakesh|マラケシュ
    marburg|Marburg|マールブルク
    marbella|Marbella|マルベーリャ
    madrid|Madrid|マドリード
    barcelona|Barcelona|バルセロナ
    valencia|Valencia|バレンシア
    paris|Paris|パリ
    lyon|Lyon|リヨン
    vancouver|Vancouver|バンクーバー
    calgary|Calgary|カルガリー
    toronto|Toronto|トロント
    montreal|Montreal|モントリオール
    ottawa|Ottawa|オタワ
    halifax|Halifax|ハリファックス
    alexandria|Alexandria|アレクサンドリア
    casablanca|Casablanca|カサブランカ
    karachi|Karachi|カラチ
    jakarta|Jakarta|ジャカルタ
    manila|Manila|マニラ
    canberra|Canberra|キャンベラ
    adelaide|Adelaide|アデレード
    cape-town|Cape Town|ケープタウン
    nairobi|Nairobi|ナイロビ
    lagos|Lagos|ラゴス
    havana|Havana|ハバナ
    santiago|Santiago|サンティアゴ
    bogota|Bogota|ボゴタ
    lima|Lima|リマ
    la-paz|La Paz|ラパス
    panama|Panama City|パナマシティ
    kathmandu|Kathmandu|カトマンズ
    ankara|Ankara|アンカラ
    athens|Athens|アテネ
    warsaw|Warsaw|ワルシャワ`),
};
const LABELS = {
  en: { stars: "Stars", planets: "Planets and moons", craft: "Craft", places: "Places", cities: "Cities", show: "Show", go: "Go", fav: "Favourite", nothing: "nothing yet", none: "none", notDone: "none" },
  ja: { stars: "星", planets: "惑星と衛星", craft: "機体", places: "場所", cities: "都市", show: "見る", go: "行く", fav: "お気に入り", nothing: "まだありません", none: "なし", notDone: "なし" },
};
// which actions each kind carries; `fav` is the toggle
const ACTIONS = { stars: ["show", "go", "fav"], planets: ["show", "go", "fav"], craft: ["go", "fav"], places: ["go"], cities: ["go", "fav"] };
const DETAIL = {
  en: { stars: "Star", planets: "Planet or moon", craft: "Craft", places: "Place", cities: "City" },
  ja: { stars: "星", planets: "惑星・衛星", craft: "機体", places: "場所", cities: "都市" },
};

const language = () => (document.documentElement.lang === "ja" ? "ja" : "en");
const favourites = new Set();
let calls = 0;
let answered = 0;

// A source that cannot stop what it started: it does not listen to the signal, so a late answer still comes back and the box must drop it.
const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

// The page's source. `group` set: that kind's whole list, and the others as counts only.
box.source = async (query, { group }) => {
  calls += 1;
  out.calls.textContent = String(calls);
  out.last.textContent = `${query}${group ? ` (${group})` : ""}`;
  await sleep(slowButton.getAttribute("aria-pressed") === "true" ? 900 : 20);
  const lang = language();
  const words = LABELS[lang];
  answered += 1;
  out.answered.textContent = String(answered);
  return Object.entries(KINDS).map(([kind, list]) => {
    const found = list
      .map(([id, en, ja, ...aliases]) => ({ id, en, ja, score: rank(query, lang === "ja" ? ja : en, [en, ja, ...aliases]) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || (lang === "ja" ? a.ja.localeCompare(b.ja, "ja") : a.en.localeCompare(b.en)));
    const wanted = group === "" || group === kind;
    return {
      id: kind,
      label: words[kind],
      total: found.length,
      rows: !wanted ? [] : found.slice(0, group === kind ? 200 : 8).map((item) => ({
        id: item.id,
        label: lang === "ja" ? item.ja : item.en,
        detail: DETAIL[lang][kind],
        actions: ACTIONS[kind].map((action) => (action === "fav" ? { id: "fav", label: words.fav, pressed: favourites.has(`${kind}:${item.id}`) } : { id: action, label: words[action] })),
      })),
    };
  }).filter((one) => one.total > 0);
};

box.addEventListener("kazoku-search-pick", (event) => {
  const { id, group, action, pressed } = event.detail;
  if (action === "fav") {
    if (pressed) favourites.add(`${group}:${id}`);
    else favourites.delete(`${group}:${id}`);
  }
  out.picked.textContent = `${action} ${group}/${id}${pressed === undefined ? "" : pressed ? " on" : " off"}`;
  out.favs.textContent = favourites.size === 0 ? LABELS[language()].none : [...favourites].join(", ");
});

slowButton.addEventListener("click", () => {
  slowButton.setAttribute("aria-pressed", String(slowButton.getAttribute("aria-pressed") !== "true"));
});

const SAY = {
  en: { title: "search box", back: "The view controls", intro: "Type a name, such as mar or a. Down moves to a result, Right and Left move across its actions, Enter does the first one. Press / or Ctrl or Command and K to come back to the box.", slow: "Slow answers", pickedLabel: "Picked", favLabel: "Favourites", callsLabel: "Source calls", answeredLabel: "Answered", lastLabel: "Last", other: "Another field" },
  ja: { title: "検索ボックス", back: "表示の操作", intro: "mar や a のように名前を入力します。下キーで結果へ移り、右キーと左キーでその操作を行き来し、Enterで最初の操作を実行します。/ か、CtrlまたはCommandとKでボックスに戻れます。", slow: "答えを遅くする", pickedLabel: "選んだもの", favLabel: "お気に入り", callsLabel: "ソースの呼び出し", answeredLabel: "答えた数", lastLabel: "直近", other: "別の入力欄" },
};
const say = () => {
  const words = SAY[language()];
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = words[el.dataset.say] ?? el.textContent;
  const other = document.querySelector("#other");
  other.placeholder = words.other;
  other.setAttribute("aria-label", words.other);
};

const show = () => {
  say();
  box.setAttribute("lang", language());
  // the same question again, in the new language
  const asked = box.value;
  if (asked.trim() !== "") box.value = asked;
  if (favourites.size === 0) out.favs.textContent = LABELS[language()].none;
};
document.getElementById("language").addEventListener("kazoku-languagechange", show);
show();
