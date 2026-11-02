// The demo draws a card with CSS 3D from the events of <kazoku-view-controls>. The element itself draws nothing.
import "./dist/view-controls/define.js";
import "./dist/theme-switch/define.js";

const $ = (id) => document.getElementById(id);
const controls = $("controls");
const card = $("card");
const zoomer = $("zoomer");

function apply(s) {
  card.style.transform = `rotateX(${s.tilt}deg) rotateY(${s.yaw}deg)`;
  zoomer.style.transform = s.zoom === 1 && s.panX === 0 && s.panY === 0 ? "" : `translate(${s.panX}px, ${s.panY}px) scale(${s.zoom})`;
  $("scene").dataset.grabbing = s.reason === "drag" && !s.final ? "1" : "";
  $("readout").textContent = `yaw ${Math.round(s.yaw)}  tilt ${Math.round(s.tilt)}  zoom ${s.zoom.toFixed(2)}  pan ${Math.round(s.panX)}, ${Math.round(s.panY)}  ${s.turning ? "turning" : "still"}  drag ${s.drag}`;
}

controls.addEventListener("kazoku-viewchange", (event) => apply(event.detail));

// The view controls follow the page's device colours by themselves; when the reader forces Light or Dark, they are told too. Auto takes the attribute off again.
const themeSwitch = $("theme");
themeSwitch.addEventListener("kazoku-themechange", (event) => {
  if (event.detail.choice === "auto") controls.removeAttribute("theme");
  else controls.setAttribute("theme", event.detail.choice);
});

// Options, off by default, switched on in the address: ?anchor=pin (the + and - buttons and keys zoom about the ring), ?key-tilt=wheel, ?stop-turn, ?tilt-step=1.
const options = new URLSearchParams(location.search);
for (const name of ["key-tilt", "stop-turn", "tilt-step"]) if (options.has(name)) controls.setAttribute(name, options.get(name));
if (options.get("anchor") === "pin") {
  const place = () => {
    const pin = $("pin");
    controls.anchor = { x: pin.offsetLeft + pin.offsetWidth / 2 - $("scene").clientWidth / 2, y: pin.offsetTop + pin.offsetHeight / 2 - $("scene").clientHeight / 2 };
  };
  place();
  window.addEventListener("resize", place);
}

const SAY = {
  en: "Drag the card to turn it. Zoom in, then drag to move it, or use the arrows. The controls never draw: the page does, from the events.",
  ja: "カードをドラッグすると回ります。拡大してからドラッグで動かすか、矢印を使います。操作部は描画しません。描くのはページです。",
};
for (const button of document.querySelectorAll("[data-lang]")) {
  button.addEventListener("click", () => {
    const lang = button.dataset.lang;
    document.documentElement.lang = lang;
    controls.setAttribute("lang", lang);
    themeSwitch.setAttribute("lang", lang);
    document.querySelector('[data-say="intro"]').textContent = SAY[lang];
    for (const other of document.querySelectorAll("[data-lang]")) other.setAttribute("aria-pressed", String(other === button));
  });
}
