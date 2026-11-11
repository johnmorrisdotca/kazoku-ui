// One globe with its name written on it, on the shared renderer: the four looks, once, twice or all round, at the equator or near a pole, and always facing the reader.
// The globe is our own drawing (a made-up land and sea and a grid), so that its turning shows. The choices are kept in the address. It opens turning unless the reader
// prefers reduced motion; nothing is drawn at rest.
import * as THREE from "three";
import "./dist/theme-switch/define.js";
import "./dist/view-controls/define.js";
import { createSharedRenderer } from "./dist/renderer/index.js";
import { createBodyLabel, loadBodyLabelFont } from "./dist/body-label/index.js";

const params = new URLSearchParams(location.search);
const CHOICES = {
  look: ["painted", "etched", "outline", "burned"],
  repeat: ["once", "both", "around"],
  where: ["equator", "north", "south"],
  name: ["EARTH", "JUPITER", "地球"],
};
const WORDS = { painted: "Painted", etched: "Etched", outline: "Outline", burned: "Burned in", once: "Once", both: "Both sides", around: "All round", equator: "Equator", north: "Near the north pole", south: "Near the south pole" };
const LATITUDE = { equator: 0, north: 55, south: -55 };
const choice = (key) => (CHOICES[key].includes(params.get(key)) ? params.get(key) : CHOICES[key][0]);
const state = { look: choice("look"), repeat: choice("repeat"), where: choice("where"), name: choice("name"), facing: params.get("facing") === "1", shown: params.get("label") !== "off" };

function keep() {
  const next = new URLSearchParams(location.search);
  for (const key of Object.keys(CHOICES)) {
    if (state[key] === CHOICES[key][0]) next.delete(key);
    else next.set(key, state[key]);
  }
  if (state.facing) next.set("facing", "1");
  else next.delete("facing");
  if (state.shown) next.delete("label");
  else next.set("label", "off");
  const query = next.toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
}

/** The globe's own picture: a sea, a few lands from a smooth made-up height, and a grid every 30 degrees. */
function globeCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const c = canvas.getContext("2d");
  const image = c.createImageData(1024, 512);
  for (let y = 0; y < 512; y += 1) {
    const lat = (0.5 - y / 512) * Math.PI;
    for (let x = 0; x < 1024; x += 1) {
      const lon = (x / 1024) * Math.PI * 2;
      const h = Math.sin(lon * 3 + 0.7) * Math.cos(lat * 2) + 0.6 * Math.sin(lon * 5 - lat * 3) + 0.4 * Math.cos(lon * 2 + lat * 5);
      const land = h > 0.55;
      const i = (y * 1024 + x) * 4;
      image.data[i] = land ? 70 + h * 30 : 18;
      image.data[i + 1] = land ? 110 + h * 20 : 52;
      image.data[i + 2] = land ? 60 : 110;
      image.data[i + 3] = 255;
    }
  }
  c.putImageData(image, 0, 0);
  c.strokeStyle = "rgba(255,255,255,0.18)";
  c.lineWidth = 1;
  for (let i = 0; i <= 12; i += 1) c.strokeRect((i * 1024) / 12, 0, 0, 512);
  for (let i = 1; i < 6; i += 1) c.strokeRect(0, (i * 512) / 6, 1024, 0);
  return canvas;
}

const rad = (degrees) => (degrees * Math.PI) / 180;
const FOV = 35;
/** Longitude 0 (three's +x) turned to face the camera, as a map's middle faces you on a desk globe. */
const FRONT = -Math.PI / 2;
const DISTANCE = 3.4;
let label;
let parts;

const renderer = createSharedRenderer({ load: () => Promise.resolve(THREE) });
const item = {
  key: "body-label-globe",
  async build({ three, width, height }) {
    await loadBodyLabelFont().catch(() => undefined);
    const scene = new three.Scene();
    const tilt = new three.Group();
    const texture = new three.CanvasTexture(globeCanvas());
    texture.colorSpace = three.SRGBColorSpace;
    const globe = new three.Mesh(new three.SphereGeometry(1, 96, 48), new three.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0 }));
    tilt.add(globe);
    scene.add(tilt, new three.AmbientLight(0xffffff, 0.45));
    const sun = new three.DirectionalLight(0xffffff, 2.6);
    sun.position.set(3, 1.5, 4);
    scene.add(sun);
    const camera = new three.PerspectiveCamera(FOV, width / height, 0.1, 50);
    camera.position.set(0, 0, DISTANCE);
    const size = { height };
    parts = { scene, tilt, globe, camera, size, texture };
    makeLabel();
    return {
      scene,
      camera,
      resize(w, h) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        size.height = h;
      },
      pose({ yaw, tilt: t, zoom }) {
        globe.rotation.y = FRONT + rad(yaw);
        tilt.rotation.x = rad(t);
        camera.position.z = DISTANCE / zoom;
      },
      update() {
        label?.update(camera, radiusPx());
        return false;
      },
      dispose() {
        label?.dispose();
        globe.geometry.dispose();
        globe.material.dispose();
        texture.dispose();
      },
    };
  },
};

/** The globe's radius on screen, in CSS pixels. */
const radiusPx = () => parts.size.height / 2 / (Math.tan(rad(FOV) / 2) * parts.camera.position.z);

function options() {
  return { text: state.name, look: state.look, repeat: state.repeat, latitude: LATITUDE[state.where], facing: state.facing };
}
function makeLabel() {
  label = createBodyLabel(THREE, options());
  if (state.shown) parts.globe.add(label.object);
  label.ready.then(() => view.invalidate());
}

const host = document.getElementById("globe");
const controls = document.getElementById("controls");
const view = renderer.view(host, item);

function redraw() {
  if (label === undefined) return;
  label.set(options());
  if (state.shown && label.object.parent === null) parts.globe.add(label.object);
  if (!state.shown && label.object.parent !== null) parts.globe.remove(label.object);
  view.invalidate();
  keep();
  show();
}

function segment(key) {
  const group = document.querySelector(`[data-testid="${key}"]`);
  for (const value of CHOICES[key]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pill";
    button.textContent = WORDS[value] ?? value;
    button.dataset.value = value;
    if (/[^\x20-\x7e]/.test(value)) button.lang = "ja";
    button.addEventListener("click", () => {
      state[key] = value;
      redraw();
    });
    group.append(button);
  }
}
for (const key of Object.keys(CHOICES)) segment(key);
for (const [id, key] of [["facing", "facing"], ["shown", "shown"]]) {
  document.getElementById(id).addEventListener("click", () => {
    state[key] = !state[key];
    redraw();
  });
}

const stats = document.getElementById("stats");
function show() {
  for (const key of Object.keys(CHOICES)) for (const button of document.querySelectorAll(`[data-testid="${key}"] button`)) button.setAttribute("aria-pressed", String(button.dataset.value === state[key]));
  document.getElementById("facing").setAttribute("aria-pressed", String(state.facing));
  document.getElementById("shown").setAttribute("aria-pressed", String(state.shown));
  const s = renderer.stats;
  const rows = [["contexts", s.contexts], ["draws", s.draws], ["live", view.live ? "yes" : "no"], ["copies", label?.layout.spans.length ?? 0]];
  stats.replaceChildren(...rows.map(([name, value]) => Object.assign(document.createElement("li"), { textContent: `${name} ${value}` })));
}

controls.addEventListener("kazoku-viewchange", (event) => {
  if (!view.live) return;
  view.scene.pose(event.detail);
  view.invalidate();
  if (event.detail.reason !== "auto") show();
});

window.kazokuDemo = { renderer, view, controls, get label() { return label; }, get parts() { return parts; }, radiusPx: () => radiusPx() };

const live = await view.focus();
if (live) {
  view.scene.pose(controls.state);
  view.invalidate();
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) controls.play();
}
show();
