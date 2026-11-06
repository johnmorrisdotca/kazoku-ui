// The options window holds the page's own controls, over a small globe.
import * as THREE from "three";
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";
import "./dist/options-window/define.js";

const SAY = {
  en: {
    title: "options window", back: "The view controls", intro: "A small window over the view. Drag the title, fold it to a chip, and snap it to a corner. The page fills it.",
    planet: "Planet options", ship: "Ship options",
    turn: "Turn speed", still: "Still", slow: "Slow", faster: "Faster", real: "Real time", labels: "Labels", show: "Show", hide: "Hide", look: "Look", line: "Line", thick: "Thick", painted: "Painted",
    variant: "Variant", v3: "v3", parts: "The parts", together: "Together", apart: "Apart", engines: "Engines", lights: "Lights", off: "Off", lit: "Lit",
    helpTurn: "Turn speed chooses how fast it spins.", helpLabels: "Labels show or hide the names.", helpLook: "Look chooses the drawing.",
  },
  ja: {
    title: "オプションの窓", back: "表示の操作", intro: "ビューの上に浮かぶ、小さな窓です。タイトルをドラッグすると、移動して角に吸い付きます。しまうとチップになります。中身はページが入れます。",
    planet: "惑星のオプション", ship: "船のオプション",
    turn: "回転の速さ", still: "静止", slow: "ゆっくり", faster: "速く", real: "実時間", labels: "名前", show: "表示", hide: "非表示", look: "見た目", line: "線画", thick: "太線", painted: "彩色",
    variant: "種類", v3: "v3", parts: "部品", together: "組み立て", apart: "分解", engines: "エンジン", lights: "照明", off: "切", lit: "点灯",
    helpTurn: "回転の速さは、どれだけ速く回るかを選びます。", helpLabels: "名前は、表示するか隠すかを選びます。", helpLook: "見た目は、描き方を選びます。",
  },
};
const say = (key) => SAY[document.documentElement.lang === "ja" ? "ja" : "en"][key];

function words() {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = say(el.dataset.say);
  const lang = document.documentElement.lang || "en";
  for (const id of ["win", "shelf", "ship"]) document.getElementById(id).setAttribute("lang", lang);
  document.getElementById("win").setAttribute("title", say("planet"));
  document.getElementById("shelf").setAttribute("title", say("planet"));
  document.getElementById("ship").setAttribute("title", say("ship"));
}
new globalThis.MutationObserver(words).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
words();

function globe(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
  camera.position.z = 4.2;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.15, 48, 32), new THREE.MeshStandardMaterial({ color: 0x3d7ea6, roughness: 0.55, metalness: 0.08 }));
  scene.add(ball, new THREE.AmbientLight(0xffffff, 0.65));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(3, 2, 4);
  scene.add(sun);
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const draw = () => {
    const stage = canvas.parentElement.getBoundingClientRect();
    if (stage.width > 0) {
      renderer.setSize(stage.width, stage.height, false);
      camera.aspect = stage.width / Math.max(stage.height, 1);
      camera.updateProjectionMatrix();
      if (!still) ball.rotation.y += 0.004;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(draw);
  };
  draw();
}
globe(document.getElementById("globe"));
globe(document.getElementById("ship-globe"));
