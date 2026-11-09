// A tiny element that carries the view controls itself with `carryControls`, four ways: the defaults, its own limits, controls off, and with a bar.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import "./dist/view-controls/define.js";
import { carryControls } from "./dist/view-controls/index.js";

const $ = (id) => document.getElementById(id);
const SAY = {
  en: { title: "an element that carries the controls", back: "The view controls", layouts: "Layouts", intro: "A package's own element can take the drag, the pinch, the wheel and the keys without a bar. The wheel scrolls the page at Fit; Ctrl or Command and the wheel zooms.", plain: "Default: 0.1× to 50×", limited: "Its own limits: 0.5× to 4×", off: "Controls off", barred: "With a bar", coded: "Limits in code: 1e-6× to 2.5×, with a bar" },
  ja: { title: "要素が自分で操作を持つ", back: "表示の操作", layouts: "レイアウト", intro: "パッケージの要素は、バーがなくてもドラッグ、ピンチ、ホイール、キーを受けられます。フィットのときホイールはページをスクロールし、CtrlまたはCommandとホイールでズームします。", plain: "既定: 0.1倍から50倍", limited: "独自の範囲: 0.5倍から4倍", off: "操作オフ", barred: "バーあり", coded: "コードで範囲指定: 1e-6倍から2.5倍、バーあり" },
};

class CarryDemo extends HTMLElement {
  #controls;
  #card;

  connectedCallback() {
    if (this.shadowRoot === null) {
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = '<style>:host{overflow:hidden;position:relative}.card{position:absolute;inset:50% auto auto 50%;width:120px;height:80px;margin:-40px 0 0 -60px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#111);transform-origin:center}</style><div class="card"></div>';
      this.#card = root.querySelector(".card");
    }
    this.#controls = carryControls(this, { turnable: true, grabRadius: 60, limits: this.id === "coded" ? { zoomMin: 1e-6, zoomMax: 2.5 } : undefined, onChange: (state) => this.setView(state) });
    this.setView(this.#controls.controller.state);
  }

  disconnectedCallback() {
    this.#controls?.unbind();
  }

  setView(state) {
    this.#card.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom}) rotateX(${-state.tilt}deg) rotateY(${state.yaw}deg)`;
    this.dataset.zoom = String(Number(state.zoom.toFixed(3)));
    this.dataset.yaw = String(Math.round(state.yaw));
    this.dataset.tilt = String(Math.round(state.tilt));
    this.dataset.panX = String(Math.round(state.panX));
    $(`${this.id}-out`).textContent = `zoom ${Number(state.zoom.toFixed(2))}×  yaw ${Math.round(state.yaw)}°  tilt ${Math.round(state.tilt)}°`;
  }
}
customElements.define("kazoku-carry-demo", CarryDemo);

for (const id of ["barred", "coded"]) $(id).nextElementSibling.addEventListener("kazoku-viewchange", ({ detail }) => $(id).setView(detail));

const say = (key) => SAY[document.documentElement.lang === "ja" ? "ja" : "en"][key];
const words = () => {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = say(el.dataset.say);
};
words();
new globalThis.MutationObserver(words).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
