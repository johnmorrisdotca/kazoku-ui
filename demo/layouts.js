// The layouts side by side: one card per layout, each drawn with CSS 3D from its own element's events, with the code that makes it.
import "./dist/language-picker/define.js";
import "./dist/view-controls/define.js";
import "./dist/theme-switch/define.js";

const all = [...document.querySelectorAll("kazoku-view-controls")];
const template = document.getElementById("card");

for (const controls of all) {
  const scene = document.getElementById(controls.getAttribute("for"));
  scene.append(template.content.cloneNode(true));
  const card = scene.querySelector(".card");
  const zoomer = scene.querySelector(".zoomer");
  controls.addEventListener("kazoku-viewchange", ({ detail: s }) => {
    card.style.transform = `rotateX(${s.tilt}deg) rotateY(${s.yaw}deg)`;
    zoomer.style.transform = s.zoom === 1 && s.panX === 0 && s.panY === 0 ? "" : `translate(${s.panX}px, ${s.panY}px) scale(${s.zoom})`;
  });
}

// The code for each layout, with the zoom range when it is not the default one.
let range = { min: "0.1", max: "50" };
const limits = () => (range.min === "0.1" && range.max === "50" ? "" : ` zoom-min="${range.min}" zoom-max="${range.max}"`);
const CODE = {
  horizontal: () => `<div id="view" tabindex="0">…your scene…</div>\n<kazoku-view-controls for="view" layout="horizontal"${limits()}></kazoku-view-controls>`,
  vertical: () => `<div style="display: flex; gap: 12px">\n  <div id="view" tabindex="0" style="flex: 1">…your scene…</div>\n  <kazoku-view-controls for="view" layout="vertical"${limits()}></kazoku-view-controls>\n</div>`,
  compact: () => `<div id="view" tabindex="0">…your scene…</div>\n<kazoku-view-controls for="view" layout="compact"${limits()}></kazoku-view-controls>`,
  classic: () => `<div id="view" tabindex="0">…your scene…</div>\n<kazoku-view-controls for="view"${limits()}></kazoku-view-controls>`,
};
const writeCode = () => {
  for (const node of document.querySelectorAll("[data-code]")) node.textContent = CODE[node.dataset.code]();
};
writeCode();

// The zoom range: the slider's marks are the ends and the common zooms between them.
for (const button of document.querySelectorAll("[data-range]")) {
  button.addEventListener("click", () => {
    const [min, max] = button.dataset.range.split("-");
    range = { min, max };
    for (const other of document.querySelectorAll("[data-range]")) other.setAttribute("aria-pressed", String(other === button));
    for (const controls of all) {
      controls.setAttribute("zoom-min", min);
      controls.setAttribute("zoom-max", max);
    }
    writeCode();
  });
}

// On a narrow screen one layout at a time, picked from a row; a wide one shows them all side by side.
const layouts = document.querySelector(".layouts");
for (const button of document.querySelectorAll("[data-pick]")) {
  button.addEventListener("click", () => {
    layouts.dataset.show = button.dataset.pick;
    for (const other of document.querySelectorAll("[data-pick]")) other.setAttribute("aria-pressed", String(other === button));
  });
}

for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    const text = CODE[button.dataset.copy]();
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
    } catch {
      // No clipboard here (an older browser, or permission refused): select the code so a press of Copy on the keyboard takes it.
      const code = button.parentElement.querySelector("code");
      window.getSelection()?.selectAllChildren(code);
      button.textContent = "Selected";
    }
    window.setTimeout(() => { button.textContent = "Copy"; }, 1500);
  });
}

const themeSwitch = document.getElementById("theme");
themeSwitch.addEventListener("kazoku-themechange", (event) => {
  for (const controls of all) {
    if (event.detail.choice === "auto") controls.removeAttribute("theme");
    else controls.setAttribute("theme", event.detail.choice);
  }
});
document.getElementById("language").addEventListener("kazoku-languagechange", (event) => {
  for (const controls of all) controls.setAttribute("lang", event.detail.lang);
  themeSwitch.setAttribute("lang", event.detail.lang);
});
