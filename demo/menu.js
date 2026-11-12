import "./dist/menu/define.js";
import "./dist/theme-switch/define.js";

const lang = new URLSearchParams(location.search).get("lang");
if (lang) {
  document.documentElement.lang = lang;
  for (const menu of document.querySelectorAll("kazoku-menu")) menu.setAttribute("lang", lang);
}

const out = document.querySelector("#out");
document.addEventListener("kazoku-menutoggle", (event) => {
  const detail = event.detail;
  if (out) out.textContent = `${detail.which} ${detail.open ? "open" : "closed"}`;
});
