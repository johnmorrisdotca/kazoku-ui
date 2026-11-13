import { expect } from "@playwright/test";

// The renderer's draw rate, measured by the page and not by the test. A window timed with the test's own wait is only as long as the runner lets it be, and a loaded runner
// runs the page a little longer than the wait. Here the page records the animation-frame timestamp of every frame and of every draw, and the rule is asserted on those.
// Needs `window.kazokuDemo.renderer` (the demo's renderer).

/** A frame's timestamp is not exact: a gap this much short of the nominal one still counts (the scheduler's tolerance). */
const TOLERANCE_MS = 2;

/** Start recording, in the page, the timestamp of every animation frame and of every draw the renderer makes from now on. Call it before the view starts turning. */
export const stampDraws = (page) =>
  page.evaluate(() => {
    const frames = [];
    const draws = [];
    window.__stamps = { frames, draws };
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) =>
      request((stamp) => {
        const before = window.kazokuDemo.renderer.stats.draws;
        callback(stamp);
        frames.push(stamp);
        for (let i = window.kazokuDemo.renderer.stats.draws - before; i > 0; i -= 1) draws.push(stamp);
      });
  });

/** What the page has recorded so far: `{ frames, draws }`, each a list of timestamps in ms. */
export const readStamps = (page) => page.evaluate(() => ({ frames: [...window.__stamps.frames], draws: [...window.__stamps.draws] }));

/** Wait until the page has drawn `count` times since `stampDraws`; a slow software frame holds the turn back, so this waits for draws and not for a time. */
export const untilDrawn = (page, count, timeout = 45_000) => expect.poll(async () => (await page.evaluate(() => window.__stamps.draws.length)), { timeout }).toBeGreaterThanOrEqual(count);

/** The rule, on the page's own timestamps: no two draws closer than 1/30 s, no 31 draws inside a second (tolerance 2 ms), so never more than 30 a second whatever the elapsed time. */
export function expectAtMost30(stamps) {
  const { draws, frames } = stamps;
  for (let i = 1; i < draws.length; i += 1) expect(draws[i] - draws[i - 1], `draw ${i} came ${draws[i] - draws[i - 1]} ms after the one before`).toBeGreaterThanOrEqual(1000 / 30 - TOLERANCE_MS - 1e-6);
  for (let i = 0; i + 30 < draws.length; i += 1) expect(draws[i + 30] - draws[i], `31 draws inside ${draws[i + 30] - draws[i]} ms from draw ${i}`).toBeGreaterThanOrEqual(1000 - TOLERANCE_MS - 1e-6);
  // The page's frames may come at 60 or more; draws never exceed the frames, and on a screen faster than 40 Hz the cap skipped some.
  expect(draws.length).toBeLessThanOrEqual(frames.length);
  const gaps = frames.slice(1).map((stamp, i) => stamp - frames[i]).sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)] ?? Infinity;
  if (median < 25) expect(draws.length, `${frames.length} frames at a median ${median} ms drew ${draws.length}`).toBeLessThan(frames.length);
}
