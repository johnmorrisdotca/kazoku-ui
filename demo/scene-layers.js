// Stand-in layers for the shared scene: shapes drawn for this page, no outside data. They are what a package's own layer is, so the host can be tried without the four packages:
// a sphere at the Earth's size, one at the Moon's distance, a small satellite and a star backdrop. Each one places its objects with `placeInFrame` (float64 kilometres, relative to
// the floating origin), turns them from the clock's moment, and hands the host its radius so the host can slice the depth.
import * as THREE from "three";
import { placeInFrame, SKY_RADIUS } from "./dist/scene/index.js";

export const EARTH_KM = 6378.137;
export const MOON_KM = 1737.4;
export const MOON_DISTANCE_KM = 384_400;
export const ORBIT_KM = EARTH_KM + 400;
const SIDEREAL_MS = 86_164_090.5;
const MOON_PERIOD_MS = 27.321661 * 86_400_000;
const ISS_PERIOD_MS = 92.7 * 60_000;
const rad = (degrees) => (degrees * Math.PI) / 180;

// A lit sphere with a graticule, in a shader of its own: a custom shader is what the depth slices are for (a logarithmic depth buffer would need this edited).
const VERTEX = `varying vec3 vWorldNormal; varying vec3 vLocal;
void main() { vLocal = normalize(position); vWorldNormal = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAGMENT = `uniform vec3 uSun; uniform vec3 uTint; uniform float uLines; varying vec3 vWorldNormal; varying vec3 vLocal;
void main() {
  float lit = 0.12 + 0.88 * max(dot(normalize(vWorldNormal), uSun), 0.0);
  vec2 g = vec2(asin(clamp(vLocal.y, -1.0, 1.0)), atan(vLocal.x, vLocal.z)) / (3.14159265 / 12.0);
  vec2 d = abs(fract(g - 0.5) - 0.5) / max(fwidth(g), vec2(1e-5));
  float line = (1.0 - min(min(d.x, d.y), 1.0)) * uLines;
  gl_FragColor = vec4(mix(uTint, vec3(1.0), line * 0.55) * lit, 1.0);
}`;

function sphereLayer(id, { radiusKm, tint, lines = 1, openingSpeed, place, spin }) {
  const geometry = new THREE.SphereGeometry(1, 64, 32);
  const material = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms: { uSun: { value: new THREE.Vector3(1, 0, 0) }, uTint: { value: new THREE.Color(tint) }, uLines: { value: lines } } });
  const root = new THREE.Mesh(geometry, material);
  const sun = new THREE.Vector3();
  const body = { id, root, radiusKm, openingSpeed, placeKm: place };
  return {
    id,
    bodies: [body],
    update(frame) {
      placeInFrame(root, frame.positionsKm.get(id), frame, radiusKm);
      root.rotation.set(0, spin(frame.ms), 0);
      material.uniforms.uSun.value.copy(sun.set(...frame.sunKm).normalize());
      return false;
    },
    credits: () => [{ text: "The Earth, the Moon and the satellite on this page are plain shapes drawn for it.", textJa: "このページの地球、月、人工衛星は、このページのために描いた単純な形です。" }],
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** A sphere at the Earth's size and place (the origin of the frame), turning once in a sidereal day. */
export const earthLayer = () => sphereLayer("earth", { radiusKm: EARTH_KM, tint: 0x2f6fd0, openingSpeed: 3600, place: () => [0, 0, 0], spin: (ms) => (2 * Math.PI * ms) / SIDEREAL_MS });

/** A sphere at the Moon's size and distance, on a circle round the Earth tipped 5 degrees, always showing the same face. */
export const moonLayer = () => {
  const at = (ms) => {
    const a = (2 * Math.PI * ms) / MOON_PERIOD_MS;
    return [MOON_DISTANCE_KM * Math.cos(a), MOON_DISTANCE_KM * Math.sin(rad(5)) * Math.sin(a), -MOON_DISTANCE_KM * Math.cos(rad(5)) * Math.sin(a)];
  };
  return sphereLayer("moon", { radiusKm: MOON_KM, tint: 0x9a9a9a, lines: 0.6, openingSpeed: 86_400, place: at, spin: (ms) => (2 * Math.PI * ms) / MOON_PERIOD_MS + Math.PI });
};

/** A sphere a hundred metres across, 400 km up on a path tipped 51.6 degrees: the size that needs the near depth slice. */
export const satelliteLayer = () => {
  const at = (ms) => {
    const a = (2 * Math.PI * ms) / ISS_PERIOD_MS;
    return [ORBIT_KM * Math.cos(a), ORBIT_KM * Math.sin(a) * Math.sin(rad(51.6)), -ORBIT_KM * Math.sin(a) * Math.cos(rad(51.6))];
  };
  return sphereLayer("satellite", { radiusKm: 0.05, tint: 0xf2c14e, lines: 0, openingSpeed: 60, place: at, spin: () => 0 });
};

/** Fifteen hundred stars at infinity: unit directions in the SPX frame, drawn first with no depth. The host's sky camera turns with the view and never moves. */
export const starLayer = () => {
  const count = 1500;
  const positions = new Float32Array(count * 3);
  let seed = 12345;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < count; i += 1) {
    const y = 2 * random() - 1;
    const angle = 2 * Math.PI * random();
    const ring = Math.sqrt(1 - y * y);
    positions.set([ring * Math.cos(angle) * SKY_RADIUS, y * SKY_RADIUS, -ring * Math.sin(angle) * SKY_RADIUS], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, depthWrite: false, transparent: true, opacity: 0.9 });
  const sky = new THREE.Points(geometry, material);
  sky.frustumCulled = false;
  return {
    id: "stars",
    bodies: [],
    sky,
    update: () => false,
    credits: () => [{ text: "The stars are random points drawn for this page, not a catalogue.", textJa: "星は、このページのためにランダムに置いた点で、星表ではありません。" }],
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
};
