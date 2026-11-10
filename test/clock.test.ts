import assert from "node:assert/strict";
import { test } from "node:test";

import { clockAddress, createClockSlot, createFamilyClock, readClockAddress, type ClockChange, type ClockSource } from "../src/clock/index.ts";

/** Clocks a test steps by hand: the page's, the wall's, and whether the tab is hidden. */
function fake(now = 0, wall = 1_700_000_000_000) {
  const state = { now, wall, hidden: false };
  const source: ClockSource = { now: () => state.now, wall: () => state.wall, hidden: () => state.hidden };
  return { state, source };
}

/** Run a clock for `seconds` of real time drawn at `fps` frames a second; every frame is a look. */
function run(clock: { advance(now?: number): number }, state: { now: number; wall: number }, seconds: number, fps: number): void {
  const step = 1000 / fps;
  for (let t = 0; t < seconds * 1000 - 1e-6; t += step) {
    state.now += step;
    state.wall += step;
    clock.advance(state.now);
  }
}

test("a clock drawn five times a second keeps time within 1% of one drawn sixty", () => {
  const start = Date.UTC(2026, 0, 1);
  const slow = fake();
  const fast = fake();
  const a = createFamilyClock({ start, speed: 3600, paused: false, source: slow.source });
  const b = createFamilyClock({ start, speed: 3600, paused: false, source: fast.source });
  run(a, slow.state, 20, 5);
  run(b, fast.state, 20, 60);
  const wanted = 20 * 3600 * 1000;
  assert.ok(Math.abs(a.time - start - wanted) / wanted < 0.01, `5 fps: ${(a.time - start) / 1000} s of game time, wanted ${wanted / 1000}`);
  assert.ok(Math.abs(a.time - b.time) / wanted < 0.01);
});

test("a clock at real time, drawn five times a second, stays on the wall clock", () => {
  const f = fake();
  const clock = createFamilyClock({ paused: false, source: f.source });
  assert.equal(clock.speed, 1);
  assert.equal(clock.running, true);
  run(clock, f.state, 10, 5);
  assert.equal(clock.time, f.state.wall);
});

test("pause holds the moment, resume carries on from it, and the time paused is not counted", () => {
  const f = fake();
  const clock = createFamilyClock({ start: 5000, speed: 10, paused: false, source: f.source });
  run(clock, f.state, 2, 5);
  assert.equal(clock.time, 5000 + 20_000);
  clock.pause(f.state.now);
  assert.equal(clock.running, false);
  assert.equal(clock.speed, 10, "the speed is kept while paused");
  const held = clock.time;
  run(clock, f.state, 30, 5);
  assert.equal(clock.time, held);
  clock.play(f.state.now);
  assert.equal(clock.running, true);
  assert.equal(clock.time, held, "play starts from the moment held");
  run(clock, f.state, 1, 5);
  assert.equal(clock.time, held + 10_000);
});

test("a clock that follows the real time and is paused does not jump to the wall clock on play", () => {
  const f = fake();
  const clock = createFamilyClock({ paused: false, source: f.source });
  clock.pause(f.state.now);
  const held = clock.time;
  f.state.now += 60_000;
  f.state.wall += 60_000;
  clock.play(f.state.now);
  assert.equal(clock.time, held);
});

test("speed 0 holds, running says so, and play after a hold goes back to the speed it had", () => {
  const f = fake();
  const clock = createFamilyClock({ start: 0, speed: 4, paused: false, source: f.source });
  clock.setSpeed(0, f.state.now);
  assert.equal(clock.running, false);
  run(clock, f.state, 3, 5);
  assert.equal(clock.time, 0);
  clock.play(f.state.now);
  assert.equal(clock.speed, 4);
  assert.equal(clock.running, true);
});

test("a negative speed runs back, and the speed changes only from the moment it is set", () => {
  const f = fake();
  const clock = createFamilyClock({ start: 100_000, speed: 1, paused: false, source: f.source });
  run(clock, f.state, 2, 5);
  clock.setSpeed(-10, f.state.now);
  run(clock, f.state, 3, 5);
  assert.equal(clock.time, 100_000 + 2000 - 30_000);
});

test("it opens moving at the opening speed, and the body in focus moves it until the reader sets a speed", () => {
  const f = fake();
  const clock = createFamilyClock({ openingSpeed: 3600, reducedMotion: false, source: f.source });
  assert.equal(clock.running, true);
  assert.equal(clock.speed, 3600);
  assert.equal(clock.touched, false);
  assert.equal(clock.openAt(60, f.state.now), true, "the focus moved to Mars");
  assert.equal(clock.speed, 60);
  clock.setSpeed(2, f.state.now);
  assert.equal(clock.touched, true);
  assert.equal(clock.openAt(86_400, f.state.now), false, "the reader's speed stays");
  assert.equal(clock.speed, 2);
});

test("a link that names a speed is the reader's: the opening speed does not replace it", () => {
  const f = fake();
  const clock = createFamilyClock({ speed: 120, ...readClockAddress("?time=2026-11-10T12:00:00Z"), source: f.source, reducedMotion: false });
  assert.equal(clock.time, Date.UTC(2026, 10, 10, 12));
  assert.equal(clock.openAt(3600), false);
  assert.equal(clock.speed, 120);
});

test("a reader who asked for reduced motion gets a still view with Play ready, and a link's pause or play wins", () => {
  const f = fake();
  const still = createFamilyClock({ openingSpeed: 3600, reducedMotion: true, source: f.source });
  assert.equal(still.running, false);
  assert.equal(still.speed, 3600, "the speed is ready for Play");
  const held = still.time;
  run(still, f.state, 5, 5);
  assert.equal(still.time, held);
  still.play(f.state.now);
  assert.equal(still.running, true);
  run(still, f.state, 1, 5);
  assert.equal(still.time, held + 3_600_000);
  assert.equal(createFamilyClock({ reducedMotion: true, paused: false, source: f.source }).running, true);
  assert.equal(createFamilyClock({ reducedMotion: false, paused: true, source: f.source }).running, false);
});

test("a tick is told at most 4 a second, none while paused or hidden, and every other change at once", () => {
  const f = fake();
  const clock = createFamilyClock({ start: 0, speed: 60, paused: false, source: f.source });
  const heard: ClockChange[] = [];
  const stop = clock.onChange((change) => heard.push(change));
  run(clock, f.state, 10, 60);
  const ticks = heard.filter((c) => c.reason === "tick");
  assert.ok(ticks.length <= 41 && ticks.length >= 38, `ticks in 10 s: ${ticks.length}`);
  assert.ok(ticks.every((c) => c.running));
  heard.length = 0;
  f.state.hidden = true;
  run(clock, f.state, 5, 60);
  assert.equal(heard.length, 0, "a hidden tab hears nothing");
  f.state.hidden = false;
  clock.pause(f.state.now);
  run(clock, f.state, 5, 60);
  assert.deepEqual(heard.map((c) => c.reason), ["pause"], "a paused clock sends no tick");
  clock.play(f.state.now);
  clock.setSpeed(5, f.state.now);
  clock.set(42, f.state.now);
  assert.deepEqual(heard.map((c) => c.reason), ["pause", "play", "speed", "set"]);
  assert.equal(heard[3]?.time, 42);
  stop();
  heard.length = 0;
  clock.set(1, f.state.now);
  assert.equal(heard.length, 0);
});

test("set puts the moment where it is told, and \"now\" follows the wall clock", () => {
  const f = fake();
  const clock = createFamilyClock({ start: 0, speed: 1, paused: false, source: f.source });
  clock.set("now", f.state.now);
  assert.equal(clock.time, f.state.wall);
  clock.set(123, f.state.now);
  run(clock, f.state, 1, 5);
  assert.equal(clock.time, 123 + 1000);
});

test("a view follows an outside clock, and keeps going from the moment it had when it lets go", () => {
  const f = fake();
  const outside = createFamilyClock({ start: 9_000_000, speed: 30, paused: false, source: f.source });
  const slot = createClockSlot({ start: 1000, speed: 1, paused: false, source: f.source });
  const heard: string[] = [];
  slot.onChange((change) => heard.push(change.reason));
  assert.equal(slot.attached, false);
  slot.attach(outside);
  assert.equal(slot.attached, true);
  assert.equal(slot.clock.time, 9_000_000);
  outside.setSpeed(60, f.state.now);
  outside.pause(f.state.now);
  assert.deepEqual(heard, ["speed", "pause"]);
  const own = slot.detach();
  assert.equal(slot.attached, false);
  assert.equal(own.time, 9_000_000);
  assert.equal(own.speed, 60);
  assert.equal(own.running, false);
  outside.set(1, f.state.now);
  assert.equal(heard.length, 2, "the outside clock is no longer heard");
  own.play(f.state.now);
  assert.deepEqual(heard, ["speed", "pause", "play"]);
  slot.dispose();
  own.set(5, f.state.now);
  assert.equal(heard.length, 3);
});

test("the address names a moment, a speed and a pause, and says them back", () => {
  assert.deepEqual(readClockAddress("?time=2026-11-10T12:00:00Z&speed=3600&play=off"), { start: Date.UTC(2026, 10, 10, 12), speed: 3600, paused: true });
  assert.deepEqual(readClockAddress(new URLSearchParams("time=now&play=on")), { start: "now", paused: false });
  assert.deepEqual(readClockAddress("?time=1794312000000"), { start: 1_794_312_000_000 });
  assert.deepEqual(readClockAddress("?time=nonsense&speed=fast&play=maybe"), {});
  const f = fake();
  const clock = createFamilyClock({ start: Date.UTC(2026, 0, 1), speed: 60, paused: false, source: f.source });
  assert.deepEqual(clockAddress(clock), { time: "2026-01-01T00:00:00.000Z", speed: "60", play: "on" });
  assert.deepEqual(readClockAddress(new URLSearchParams(clockAddress(clock))), { start: Date.UTC(2026, 0, 1), speed: 60, paused: false });
});
