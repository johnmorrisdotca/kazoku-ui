import assert from "node:assert/strict";
import { test } from "node:test";

import { createFamilyClock, type ClockSource } from "../src/clock/index.ts";
import type { GLRenderer } from "../src/renderer/renderer.ts";
import { AU_KM, composeScene, fitDistanceKm, lengthKm, lowPrecisionSun, orbitOffsetKm, placeInFrame, planSlices, type CameraLike, type Object3DLike, type SceneBody, type SceneFrame, type SceneLayer, type SceneLike, type SceneThree, type Vec3Km } from "../src/scene/index.ts";

// --- stand-ins for three's objects, enough for the host's glue -------------------------------------------------------------------------------------------

class FakeObject implements Object3DLike {
  visible = true;
  parent: unknown = null;
  at: Vec3Km = [0, 0, 0];
  size = 1;
  position = { set: (x: number, y: number, z: number) => { this.at = [x, y, z]; } };
  scale = { setScalar: (s: number) => { this.size = s; } };
}
class FakeScene implements SceneLike {
  children = new Set<Object3DLike>();
  add(object: Object3DLike): void {
    const old = object.parent as FakeScene | null;
    if (old !== null && old !== this) old.children.delete(object);
    object.parent = this;
    this.children.add(object);
  }
  remove(object: Object3DLike): void {
    this.children.delete(object);
    object.parent = null;
  }
}
class FakeCamera implements CameraLike {
  fov: number;
  aspect: number;
  near: number;
  far: number;
  at: Vec3Km = [0, 0, 0];
  looked = false;
  position = { set: (x: number, y: number, z: number) => { this.at = [x, y, z]; } };
  up = { set: () => undefined };
  quaternion = { copy: () => undefined };
  constructor(fov: number, aspect: number, near: number, far: number) {
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
  }
  lookAt(): void {
    this.looked = true;
  }
  updateProjectionMatrix(): void {}
}
const three: SceneThree = { Scene: FakeScene, PerspectiveCamera: FakeCamera };

/** A GL that records each render with the planes and which bodies were visible. */
function fakeGL() {
  const log: { scene: FakeScene; near: number; far: number; autoClear: boolean | undefined; visible: Set<Object3DLike>; clearedBefore: boolean }[] = [];
  let cleared = false;
  const gl = {
    autoClear: true as boolean | undefined,
    clearDepth: () => { cleared = true; },
    render(scene: unknown, camera: unknown) {
      const s = scene as FakeScene;
      log.push({ scene: s, near: (camera as FakeCamera).near, far: (camera as FakeCamera).far, autoClear: gl.autoClear, visible: new Set([...s.children].filter((c) => c.visible)), clearedBefore: cleared });
      cleared = false;
    },
  };
  return { gl: gl as unknown as GLRenderer, raw: gl, log };
}

function body(id: string, radiusKm: number, placeKm: Vec3Km, openingSpeed = 1): SceneBody {
  return { id, root: new FakeObject(), radiusKm, openingSpeed, placeKm: () => placeKm };
}
function layer(id: string, bodies: SceneBody[], options: { sky?: boolean; moving?: boolean; credits?: { text: string }[] } = {}) {
  const frames: SceneFrame[] = [];
  const made: SceneLayer & { frames: SceneFrame[]; disposed: number } = {
    id,
    bodies,
    ...(options.sky ? { sky: new FakeObject() } : {}),
    frames,
    disposed: 0,
    update(frame) {
      frames.push(frame);
      for (const b of bodies) placeInFrame(b.root, frame.positionsKm.get(b.id) as Vec3Km, frame, b.radiusKm);
      return options.moving === true;
    },
    credits: () => options.credits ?? [],
    dispose() {
      made.disposed += 1;
    },
  };
  return made;
}
function fakeSource(): { source: ClockSource; state: { now: number; wall: number } } {
  const state = { now: 0, wall: Date.UTC(2026, 10, 10) };
  return { source: { now: () => state.now, wall: () => state.wall, hidden: () => false }, state };
}
/** What the renderer hands `build`: the host uses the three it was given, so the context's own is not read. */
const context = (width: number, height: number) => ({ three: three as never, assets: undefined as never, width, height });
const EARTH = 6378.137;
const MOON_KM = 384_400;

// --- maths -----------------------------------------------------------------------------------------------------------------------------------------

test("the camera orbits the focus: yaw round y from +z, tilt up from the equator", () => {
  const [x, y, z] = orbitOffsetKm(100, 0, 0);
  assert.deepEqual([Math.round(x), Math.round(y), Math.round(z)], [0, 0, 100]);
  const [x2, , z2] = orbitOffsetKm(100, 90, 0);
  assert.deepEqual([Math.round(x2), Math.round(z2)], [100, 0]);
  const up = orbitOffsetKm(100, 0, 90);
  assert.ok(up[1] > 99.9 && up[1] < 100, "the tilt is held under 90 so the view never flips");
  assert.ok(Math.abs(lengthKm(orbitOffsetKm(7, 33, -20)) - 7) < 1e-12);
  assert.ok(fitDistanceKm(1, 40) > 2.5 && fitDistanceKm(1, 40) < 4);
});

test("an object is placed from float64 kilometres relative to the floating origin, so Neptune and a rivet fit one scene", () => {
  const object = new FakeObject();
  const neptune: Vec3Km = [4_495_000_000, 12, -3];
  const at = placeInFrame(object, [neptune[0] + 0.001, neptune[1], neptune[2]], { focusKm: neptune, unitKm: 0.001 }, 0.0005);
  assert.ok(Math.abs(at[0] - 1) < 2e-3, `a metre from the focus, at Neptune, is a unit to a millimetre: ${at[0]}`);
  assert.equal(object.size, 0.5);
  assert.equal(Math.fround(at[0]), Math.fround(object.at[0]));
});

test("the Sun is where the equinoxes and solstices say, in the SPX frame", () => {
  const march = lowPrecisionSun(Date.UTC(2026, 2, 20, 14, 46));
  assert.ok(march[0] > 0.99 * AU_KM * 0.996 && Math.abs(march[1]) < 0.002 * AU_KM && Math.abs(march[2]) < 0.002 * AU_KM, "on the March equinox the Sun is at the vernal equinox, x");
  const june = lowPrecisionSun(Date.UTC(2026, 5, 21, 8, 24));
  assert.ok(june[1] > 0.39 * AU_KM, "on the June solstice it is 23.4 degrees north: y is up");
  const december = lowPrecisionSun(Date.UTC(2026, 11, 21, 20, 50));
  assert.ok(december[1] < -0.39 * AU_KM);
  const september = lowPrecisionSun(Date.UTC(2026, 8, 23, 0, 5));
  assert.ok(september[0] < -0.99 * AU_KM * 0.996);
  const jan = lengthKm(lowPrecisionSun(Date.UTC(2026, 0, 3))) / AU_KM;
  const jul = lengthKm(lowPrecisionSun(Date.UTC(2026, 6, 6))) / AU_KM;
  assert.ok(jan < 0.984 && jul > 1.016, "closest in early January, farthest in early July");
});

// --- depth -----------------------------------------------------------------------------------------------------------------------------------------

test("from 400 km above the Earth, close to a rocket, the rocket is the near slice, the Earth and the Moon the far one, and none is cut", () => {
  const slices = planSlices([
    { id: "rocket", distanceKm: 0.05, radiusKm: 0.01 },
    { id: "earth", distanceKm: EARTH + 400, radiusKm: EARTH },
    { id: "moon", distanceKm: MOON_KM, radiusKm: 1737.4 },
  ]);
  assert.equal(slices.length, 2);
  assert.deepEqual(slices[0]?.ids, ["earth", "moon"], "the far slice is drawn first");
  assert.deepEqual(slices[1]?.ids, ["rocket"]);
  const [far, near] = slices as [(typeof slices)[number], (typeof slices)[number]];
  assert.ok(near.nearKm < 0.05 && near.farKm > 0.06, "the rocket is inside its planes");
  assert.ok(far.nearKm <= 400 * 0.5 + 1e-9, "the Earth's nearest surface is beyond the far slice's near plane");
  assert.ok(far.farKm >= (EARTH + 400 + EARTH) && far.farKm >= MOON_KM + 1737.4, "the Earth's far side and the Moon's are inside");
  assert.ok(far.farKm / far.nearKm < 1e5, "a ratio a 24-bit depth buffer resolves");
});

test("farther from the rocket, it and the Earth share the near slice and only the Moon is far", () => {
  const slices = planSlices([
    { id: "rocket", distanceKm: 1, radiusKm: 0.01 },
    { id: "earth", distanceKm: EARTH + 400, radiusKm: EARTH },
    { id: "moon", distanceKm: MOON_KM, radiusKm: 1737.4 },
  ]);
  assert.deepEqual(slices.map((s) => s.ids), [["moon"], ["rocket", "earth"]]);
  assert.ok((slices[1]?.farKm ?? 0) > 2 * EARTH + 400, "the Earth is whole inside the near planes");
});

test("at the Moon's distance the Earth is not clipped, and bodies near each other share a slice", () => {
  const slices = planSlices([
    { id: "moon", distanceKm: 1737.4 + 100, radiusKm: 1737.4 },
    { id: "earth", distanceKm: MOON_KM, radiusKm: EARTH },
  ]);
  const all = slices.flatMap((s) => s.ids);
  assert.deepEqual(all.sort(), ["earth", "moon"]);
  for (const slice of slices) assert.ok(slice.nearKm > 0 && slice.farKm > slice.nearKm);
  const earth = slices.find((s) => s.ids.includes("earth"));
  assert.ok(earth !== undefined && earth.farKm > MOON_KM + EARTH, "the Earth is whole inside its planes");
  assert.equal(planSlices([{ id: "a", distanceKm: 10, radiusKm: 1 }, { id: "b", distanceKm: 30, radiusKm: 1 }]).length, 1);
  assert.deepEqual(planSlices([]), []);
});

test("a camera inside a body's bounding radius still gets a positive near plane", () => {
  const [slice] = planSlices([{ id: "earth", distanceKm: 100, radiusKm: EARTH }]);
  assert.ok(slice !== undefined && slice.nearKm > 0 && slice.farKm > slice.nearKm);
});

// --- the host ----------------------------------------------------------------------------------------------------------------------------------------

function make(options: { moving?: boolean } = {}) {
  const clockState = fakeSource();
  const clock = createFamilyClock({ start: Date.UTC(2026, 10, 10), speed: 3600, paused: false, source: clockState.source });
  const stars = layer("stars", [], { sky: true, credits: [{ text: "Yale Bright Star Catalogue" }] });
  const earth = layer("earth", [body("earth", EARTH, [0, 0, 0], 3600)], { credits: [{ text: "Natural Earth" }, { text: "Yale Bright Star Catalogue" }] });
  const moonAndMars = layer("planets", [body("moon", 1737.4, [MOON_KM, 0, 0], 86_400), body("mars", 3389.5, [2e8, 1e7, -5e7], 604_800)], options);
  const rocket = layer("rocket", [body("rocket", 0.01, [EARTH + 400, 0, 0], 60)]);
  const layers = [stars, earth, moonAndMars, rocket];
  // `stars` has a sky and no bodies: a layer need not have bodies.
  const scene = composeScene(three, { layers, clock, focus: "earth" });
  return { scene, clock, clockState, layers, stars, earth, moonAndMars, rocket };
}

test("one frame: every layer is told the same moment, origin and unit, in the same draw, and the clock moves once", () => {
  const { scene, clock, clockState, layers } = make();
  const built = scene.build(context(800, 600)) as ReturnType<typeof scene.build> & { update(dt: number, now: number): boolean; render(gl: GLRenderer): void };
  const { gl } = fakeGL();
  clockState.state.now += 1000;
  built.update(0.03, 0);
  built.render(gl);
  const told = layers.map((l) => (l as unknown as { frames: SceneFrame[] }).frames.at(-1) as SceneFrame);
  assert.equal(told.length, 4);
  for (const frame of told) {
    assert.equal(frame.ms, told[0]?.ms);
    assert.equal(frame.unitKm, EARTH);
    assert.deepEqual(frame.focusKm, [0, 0, 0]);
    assert.equal(frame, told[0], "one frame, handed to all");
  }
  assert.equal(clock.time, Date.UTC(2026, 10, 10) + 3_600_000);
  assert.equal(scene.stats.frames, 1, "update then render is one frame, not two");
  clock.set(Date.UTC(2030, 0, 1));
  built.update(0.03, 0);
  const again = layers.map((l) => (l as unknown as { frames: SceneFrame[] }).frames.at(-1)?.ms);
  assert.deepEqual(again, [Date.UTC(2030, 0, 1), Date.UTC(2030, 0, 1), Date.UTC(2030, 0, 1), Date.UTC(2030, 0, 1)]);
  assert.ok(told[0]?.sunKm !== undefined && lengthKm(told[0].sunKm) > 0.98 * AU_KM);
  assert.equal(told[0]?.positionsKm.get("moon")?.[0], MOON_KM);
});

test("the focus is the floating origin: moving it re-bases every body, in float64 kilometres over the unit", () => {
  const { scene, earth, moonAndMars } = make();
  const built = scene.build(context(800, 600)) as unknown as { update(): boolean; render(gl: GLRenderer): void };
  built.update();
  const moon = (moonAndMars.bodies[0]?.root as FakeObject);
  assert.ok(Math.abs(moon.at[0] - MOON_KM / EARTH) < 1e-9);
  scene.camera.focusOn("moon");
  built.update();
  assert.deepEqual(moon.at, [0, 0, 0]);
  assert.ok(Math.abs((earth.bodies[0]?.root as FakeObject).at[0] + MOON_KM / 1737.4) < 1e-9);
  assert.equal(moon.size, 1, "the unit is the focus's radius");
  assert.throws(() => scene.camera.focusOn("pluto"), /no body called "pluto"/);
});

test("the opening speed follows the body in focus until the reader sets a speed", () => {
  const f = fakeSource();
  const clock = createFamilyClock({ source: f.source, reducedMotion: false, paused: false });
  const a = layer("a", [body("earth", EARTH, [0, 0, 0], 3600), body("moon", 1737.4, [MOON_KM, 0, 0], 86_400)]);
  const scene = composeScene(three, { layers: [a], clock });
  assert.equal(clock.speed, 3600, "it opens at the first body's speed");
  scene.camera.focusOn("moon");
  assert.equal(clock.speed, 86_400);
  clock.setSpeed(2);
  scene.camera.focusOn("earth");
  assert.equal(clock.speed, 2, "the reader's speed is kept");
});

test("a reader who asked for reduced motion gets a still scene: it asks for no further draw until Play", () => {
  const f = fakeSource();
  const clock = createFamilyClock({ source: f.source, reducedMotion: true });
  const a = layer("a", [body("earth", EARTH, [0, 0, 0], 3600)]);
  const scene = composeScene(three, { layers: [a], clock });
  const built = scene.build(context(800, 600)) as unknown as { update(): boolean };
  assert.equal(built.update(), false);
  clock.play();
  assert.equal(built.update(), true);
  clock.pause();
  assert.equal(built.update(), false);
});

test("paused, it rests: nothing asks to be drawn again; running, it does; a layer that still moves keeps it going", () => {
  const { scene, clock } = make();
  const built = scene.build(context(800, 600)) as unknown as { update(): boolean };
  assert.equal(built.update(), true);
  clock.pause();
  assert.equal(built.update(), false);
  const moving = make({ moving: true });
  moving.clock.pause();
  assert.equal((moving.scene.build(context(8, 6)) as unknown as { update(): boolean }).update(), true);
});

test("a bound view is drawn again when the clock is set, played or paused, or the camera moves, and not on a tick", () => {
  const { scene, clock, clockState } = make();
  let draws = 0;
  const stop = scene.bind({ invalidate: () => { draws += 1; } });
  clock.set(1);
  clock.pause();
  clock.play();
  clock.setSpeed(5);
  assert.equal(draws, 4);
  scene.camera.set({ yaw: 30 });
  assert.equal(draws, 5);
  scene.camera.set({ yaw: 30 });
  assert.equal(draws, 5, "no change, no draw");
  scene.camera.look({ yaw: 40, tilt: 20, zoom: 2 });
  assert.equal(draws, 6);
  clockState.state.now += 1000;
  clock.advance();
  assert.equal(draws, 6, "a tick is the draw loop's own business");
  stop();
  clock.set(2);
  assert.equal(draws, 6);
});

test("the passes: the sky, then the far slice, then the near one, the depth cleared before each, the colour only before the first, nothing left changed", () => {
  const { scene, rocket, earth, moonAndMars, stars } = make();
  scene.camera.set({ focus: "rocket", distanceKm: 0.05 });
  const built = scene.build(context(800, 600)) as unknown as { update(): boolean; render(gl: GLRenderer): void };
  const fake = fakeGL();
  built.update();
  built.render(fake.gl);
  assert.equal(fake.log.length, 3);
  const [sky, far, near] = fake.log as [(typeof fake.log)[number], (typeof fake.log)[number], (typeof fake.log)[number]];
  assert.ok(sky.visible.has(stars.sky as FakeObject) && sky.autoClear === true);
  assert.equal(far.autoClear, false);
  assert.equal(far.clearedBefore, true);
  assert.equal(near.clearedBefore, true);
  const names = (pass: typeof far): string[] => [...pass.visible].map((o) => [...earth.bodies, ...moonAndMars.bodies, ...rocket.bodies].find((b) => b.root === o)?.id ?? "?").sort();
  assert.deepEqual(names(far), ["earth", "mars", "moon"]);
  assert.deepEqual(names(near), ["rocket"]);
  assert.ok(far.near > near.far, "the slices do not overlap in what they hold: the far one starts beyond the near one's end");
  assert.equal(fake.raw.autoClear, true, "the renderer's autoClear is put back");
  assert.ok([...earth.bodies, ...moonAndMars.bodies, ...rocket.bodies].every((b) => b.root.visible), "every body is visible again");
  assert.equal(scene.stats.passes, 3);
});

test("a body the layer hid stays hidden in every pass", () => {
  const { scene, moonAndMars } = make();
  (moonAndMars.bodies[0]?.root as FakeObject).visible = false;
  const built = scene.build(context(800, 600)) as unknown as { update(): boolean; render(gl: GLRenderer): void };
  const fake = fakeGL();
  built.update();
  built.render(fake.gl);
  assert.ok(fake.log.every((pass) => !pass.visible.has(moonAndMars.bodies[0]?.root as FakeObject)));
  assert.equal((moonAndMars.bodies[0]?.root as FakeObject).visible, false);
});

test("a renderer with no clearDepth draws everything once over the whole range", () => {
  const { scene } = make();
  scene.camera.set({ focus: "rocket", distanceKm: 0.05 });
  const built = scene.build(context(800, 600)) as unknown as { update(): boolean; render(gl: GLRenderer): void };
  const fake = fakeGL();
  delete (fake.raw as { clearDepth?: unknown }).clearDepth;
  built.update();
  built.render(fake.gl);
  assert.equal(fake.log.length, 2, "the sky and one pass");
  assert.equal(fake.log[1]?.visible.size, 4);
});

test("a still is drawn without update: the scene computes its own frame, and the roots come back to the live scene", () => {
  const { scene, earth } = make();
  const live = scene.build(context(800, 600)) as unknown as { scene: FakeScene; update(): boolean; render(gl: GLRenderer): void; dispose(): void };
  const fake = fakeGL();
  live.update();
  live.render(fake.gl);
  const shot = scene.build(context(320, 200)) as unknown as { scene: FakeScene; render(gl: GLRenderer): void; dispose(): void };
  shot.render(fake.gl);
  assert.equal(scene.stats.frames, 2, "the still worked out its own frame");
  shot.dispose();
  const root = earth.bodies[0]?.root as FakeObject;
  assert.equal(root.parent, null, "the still's scene let go of the roots");
  live.update();
  live.render(fake.gl);
  assert.equal(root.parent, live.scene, "the live scene takes them back on its next draw");
  live.dispose();
  assert.equal(root.parent, null);
});

test("credits are the layers' own, each once; ids must be one each; dispose lets every layer go", () => {
  const { scene, layers } = make();
  assert.deepEqual(scene.credits().map((c) => c.text), ["Yale Bright Star Catalogue", "Natural Earth"]);
  assert.throws(() => composeScene(three, { layers: [layer("x", [body("a", 1, [0, 0, 0])]), layer("y", [body("a", 1, [0, 0, 0])])], clock: createFamilyClock() }), /two bodies are called "a"/);
  assert.throws(() => composeScene(three, { layers: [], clock: createFamilyClock() }), /at least one body/);
  scene.dispose();
  assert.deepEqual(layers.map((l) => (l as unknown as { disposed: number }).disposed), [1, 1, 1, 1]);
});

test("the view controls' state turns and zooms the camera about the focused body", () => {
  const { scene } = make();
  const fit = scene.camera.fitKm();
  scene.camera.look({ yaw: 50, tilt: 10, zoom: 2 });
  const state = scene.camera.state;
  assert.equal(state.yaw, -50, "the body turns one way, the camera goes the other");
  assert.equal(state.tilt, 10);
  assert.ok(Math.abs(state.distanceKm - fit / 2) < 1e-9);
  scene.camera.look({ zoom: 1e12 });
  assert.ok(scene.camera.state.distanceKm > EARTH, "the camera never goes inside the body");
  scene.camera.set({ tilt: 200 });
  assert.equal(scene.camera.state.tilt, 89);
});
