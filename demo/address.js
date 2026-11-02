// Choices kept in the address, with createAddressState: the page's own choices (a name, a size, dots) and, beside them, the theme switch and the language picker, which use the same state.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import { createAddressState } from "./dist/address-state/index.js";

const $ = (id) => document.getElementById(id);
const state = createAddressState({ defaults: { size: "m", dots: "off" } });
const SAY = {
  en: { title: "choices in the address", back: "The view controls", intro: "Change anything. The address changes with it and nothing is added to the history. Copy the address, reload or open it in another tab: the same choices come back.", name: "Name", size: "Size", dots: "Dots", dotsButton: "Show dots", reset: "Reset", now: "The address", plain: "(plain)", anon: "Your name" },
  ja: { title: "アドレスに残す選択", back: "表示の操作", intro: "何でも変えてみてください。アドレスも変わりますが、履歴は増えません。アドレスをコピーするか、再読み込みするか、別のタブで開くと、同じ選択が戻ります。", name: "名前", size: "大きさ", dots: "点", dotsButton: "点を出す", reset: "元に戻す", now: "いまのアドレス", plain: "（何もなし）", anon: "あなたの名前" },
};
const say = (key) => SAY[document.documentElement.lang === "ja" ? "ja" : "en"][key];

function show() {
  const name = state.get("name") ?? "";
  if ($("name").value !== name) $("name").value = name;
  $("name").placeholder = say("anon");
  const size = state.get("size");
  const dots = state.get("dots");
  for (const button of document.querySelectorAll("#size button")) button.setAttribute("aria-pressed", String(button.dataset.v === size));
  $("dots").setAttribute("aria-pressed", String(dots === "on"));
  $("sample").dataset.size = size;
  $("sample").dataset.dots = dots;
  $("sample-text").textContent = name === "" ? say("anon") : name;
  showAddress();
}

// The address is written a quarter of a second after the last change (Safari stops a page that changes it more than a hundred times in thirty seconds), so it is read then.
let later;
function showAddress() {
  window.clearTimeout(later);
  later = window.setTimeout(() => { $("address").textContent = location.search === "" ? say("plain") : location.search; }, 300);
}

function words() {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = say(el.dataset.say);
  show();
}

// One line for each change the state hears: from this page's buttons, from the picker and the switch, or from the back button.
state.subscribe((change) => {
  const line = document.createElement("li");
  line.textContent = `${change.source}: ${change.key} ${change.previous ?? "-"} -> ${change.value ?? "-"}`;
  $("log").prepend(line);
  while ($("log").children.length > 6) $("log").lastChild.remove();
  show();
});

$("name").addEventListener("input", () => state.set("name", $("name").value.trim() === "" ? null : $("name").value));
for (const button of document.querySelectorAll("#size button")) button.addEventListener("click", () => state.set("size", button.dataset.v));
$("dots").addEventListener("click", () => state.set("dots", state.get("dots") === "on" ? "off" : "on"));
$("reset").addEventListener("click", () => state.setMany({ name: null, size: null, dots: null }));
document.addEventListener("kazoku-languagechange", words);
words();
