// A view that makes and binds its own controller: no <kazoku-view-controls>, no carryControls, no event, and no controller property on the element. The controller is kept on window for a test.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import { createViewController } from "./dist/view-controls/index.js";

const element = document.getElementById("own");
const card = document.getElementById("own-card");
const zoomer = document.getElementById("own-zoomer");
const out = document.getElementById("own-out");

const draw = (state) => {
  card.style.transform = `rotateZ(${state.roll ?? 0}deg) rotateX(${state.tilt}deg) rotateY(${state.yaw}deg)`;
  zoomer.style.transform = state.zoom === 1 && state.panX === 0 && state.panY === 0 ? "" : `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  out.textContent = `zoom ${Number(state.zoom.toFixed(2))}×  yaw ${Math.round(state.yaw)}°  tilt ${Math.round(state.tilt)}°`;
};

const view = createViewController({ turnable: true, grabRadius: 60, onChange: draw });
view.bind(element);
draw(view.state);
window.ownView = view;

const SAY = {
  en: { title: "a view with its own controller", back: "The view controls", carry: "An element that carries the controls", intro: "This view makes its own controller and binds it. The page has no bar, the element sends no event and has no controller property. The controller is on window as ownView, and a test hands that name to checkGestures." },
  ja: { title: "自前のコントローラーを持つ表示", back: "表示の操作", carry: "要素が自分で操作を持つ", intro: "この表示は自分でコントローラーを作って結び付けています。ページにバーはなく、要素はイベントを送らず、controllerプロパティも持ちません。コントローラーはownViewという名前でwindowにあり、テストはその名前をcheckGesturesに渡します。" },
};
const words = () => {
  const say = SAY[document.documentElement.lang === "ja" ? "ja" : "en"];
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = say[el.dataset.say];
};
words();
new globalThis.MutationObserver(words).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
