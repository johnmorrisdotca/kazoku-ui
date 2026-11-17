// A search box over a very long answer: 9,812 made-up names that start with "Starlink-" and 188 that start with "Orbcomm-", so one kind has ten thousand rows in all. Nothing is fetched.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import "./dist/page-frame/define.js";
import "./dist/search-box/define.js";

const box = document.querySelector("#lbox");
const picked = document.querySelector("#picked");
const NAMES = [
  ...Array.from({ length: 9812 }, (_, i) => `Starlink-${i + 1}`),
  ...Array.from({ length: 188 }, (_, i) => `Orbcomm-${i + 1}`),
];
const LABELS = { en: { sats: "Satellites", go: "Go", fav: "Favourite" }, ja: { sats: "衛星", go: "移動", fav: "お気に入り" } };
const language = () => (document.documentElement.lang === "ja" ? "ja" : "en");

// The page's source. `group` set: every row that matches (the box draws them as the reader goes on); not set: a few rows and the total.
box.source = (query, { group }) => {
  const words = LABELS[language()];
  const needle = query.toLowerCase();
  const found = NAMES.filter((name) => name.toLowerCase().includes(needle));
  const all = group === "sats";
  return [
    {
      id: "sats",
      label: words.sats,
      total: found.length,
      rows: (group === "" || all ? found : []).slice(0, all ? found.length : 8).map((name) => ({ id: name, label: name, detail: "Starlink / Orbcomm", actions: [{ id: "go", label: words.go, icon: "go" }, { id: "fav", label: words.fav, icon: "star", pressed: false }] })),
    },
  ].filter((one) => one.total > 0);
};
box.addEventListener("kazoku-search-pick", (event) => {
  const { id, action, pressed } = event.detail;
  picked.textContent = `${action} ${id}${pressed === undefined ? "" : pressed ? " on" : " off"}`;
});

const SAY = {
  en: { title: "search long list", back: "The search box", intro: "Type starlink, then press See all. The page makes ten thousand names; the box draws a window of them and goes on as you scroll, or press Down or Page Down.", pickedLabel: "Picked" },
  ja: { title: "検索の長い一覧", back: "検索ボックス", intro: "starlink と入力し、「すべてを見る」を押します。このページは1万件の名前を作り、ボックスはその一部を表示して、スクロールや下キー、Page Downで続きを表示します。", pickedLabel: "選択" },
};
const show = () => {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = SAY[language()][el.dataset.say] ?? el.textContent;
  box.setAttribute("lang", language());
  const asked = box.value;
  if (asked.trim() !== "") box.value = asked;
};
document.getElementById("language").addEventListener("kazoku-languagechange", show);
show();
