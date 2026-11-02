// Thirty views on one shared renderer: each card is a host element with its own item (a shape and a colour); the focused one is live, the rest are stills.
// The renderer draws only when asked: the view controls say what changed (kazoku-viewchange) and the page invalidates the focused view.
import * as THREE from "three";
import "./dist/theme-switch/define.js";
import "./dist/view-controls/define.js";
import { createSharedRenderer } from "./dist/renderer/index.js";

const params = new URLSearchParams(location.search);
const number = (name) => (params.has(name) && Number.isFinite(Number(params.get(name))) ? Number(params.get(name)) : undefined);
const rad = (degrees) => (degrees * Math.PI) / 180;

const contextEvents = [];
const renderer = createSharedRenderer({
  load: () => Promise.resolve(THREE),
  onContext: (state) => contextEvents.push(state),
  ...(number("stills") === undefined ? {} : { stillBytes: number("stills") }),
  ...(number("release") === undefined ? {} : { releaseMs: number("release") }),
  ...(number("linger") === undefined ? {} : { lingerMs: number("linger") }),
});

const SHAPES = {
  cube: () => new THREE.BoxGeometry(1.5, 1.5, 1.5),
  knot: () => new THREE.TorusKnotGeometry(0.8, 0.28, 96, 16),
  gem: () => new THREE.IcosahedronGeometry(1.1, 0),
};
const BASE_YAW = 0.6;

/** The adapter: what one kind of card looks like. Geometry and material come from the shared cache by key. */
const itemFor = (shape, hue) => ({
  key: `${shape}:${hue}`,
  build({ three, assets, width, height }) {
    const geometry = assets.acquire(`geometry:${shape}`, SHAPES[shape], (g) => g.dispose());
    const material = assets.acquire(`material:${hue}`, () => new three.MeshStandardMaterial({ color: new three.Color(`hsl(${hue}, 70%, 55%)`), roughness: 0.4, metalness: 0.1 }), (m) => m.dispose());
    const scene = new three.Scene();
    const mesh = new three.Mesh(geometry, material);
    mesh.rotation.set(0.35, BASE_YAW, 0);
    scene.add(mesh, new three.AmbientLight(0xffffff, 1.2));
    const light = new three.DirectionalLight(0xffffff, 2.5);
    light.position.set(2, 3, 4);
    scene.add(light);
    const camera = new three.PerspectiveCamera(35, width / height, 0.1, 50);
    camera.position.set(0, 0, 5);
    return {
      scene,
      camera,
      resize(w, h) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      },
      pose({ yaw, tilt, zoom }) {
        mesh.rotation.set(0.35 + rad(tilt), BASE_YAW + rad(yaw), 0);
        camera.position.z = 5 / zoom;
      },
    };
  },
});

const wall = document.getElementById("wall");
const controls = document.getElementById("controls");
const names = Object.keys(SHAPES);
const views = [];
const seen = new IntersectionObserver((entries) => {
  for (const entry of entries) if (entry.isIntersecting) views.find((v) => v.host === entry.target)?.showStill();
});
for (let i = 0; i < 30; i += 1) {
  const shape = names[i % names.length];
  const cell = document.createElement("div");
  cell.className = "cell";
  const host = document.createElement("div");
  host.className = "host";
  host.tabIndex = 0;
  host.setAttribute("role", "group");
  host.setAttribute("aria-label", `Card ${i + 1}, ${shape}`);
  host.dataset.testid = `host-${i}`;
  const label = document.createElement("small");
  label.textContent = `${i + 1} · ${shape}`;
  cell.append(host, label);
  wall.append(cell);
  const view = renderer.view(host, itemFor(shape, (i * 12) % 360));
  views.push(view);
  host.addEventListener("focus", () => focusView(view));
  seen.observe(host);
}

let current;
async function focusView(view) {
  if (current === view) return;
  current = view;
  for (const v of views) v.host.dataset.live = v === view ? "1" : "";
  const live = await view.focus();
  if (!live || current !== view) return;
  controls.view = view.host;
  controls.front();
  controls.fit();
  apply(controls.state);
}

function apply(state) {
  const view = renderer.focused;
  if (view === undefined || !view.live) return;
  view.scene.pose(state);
  view.invalidate();
}
controls.addEventListener("kazoku-viewchange", (event) => apply(event.detail));

const fill = document.getElementById("fill");
fill.addEventListener("click", () => {
  const on = fill.getAttribute("aria-pressed") !== "true";
  fill.setAttribute("aria-pressed", String(on));
  renderer.focused?.host.classList.toggle("fill", on);
});

const stats = document.getElementById("stats");
function show() {
  const s = renderer.stats;
  const rows = [
    ["contexts", s.contexts],
    ["live", s.live ? "yes" : "no"],
    ["draws", s.draws],
    ["frames asked", s.frames.requests],
    ["canvas", `${s.canvas.width}×${s.canvas.height} (${(s.canvas.pixels / 1e6).toFixed(1)} MP)`],
    ["assets", `${s.assets.entries} held, ${s.assets.hits} reused`],
    ["stills", `${s.stills.count}, ${(s.stills.bytes / 1e6).toFixed(1)} MB`],
  ];
  stats.replaceChildren(...rows.map(([name, value]) => Object.assign(document.createElement("li"), { textContent: `${name} ${value}` })));
}
setInterval(show, 500);
show();

window.kazokuDemo = { contextEvents, renderer, views, controls, focusView, show };
focusView(views[0]);
