import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const ground = (await import(new URL("../templates/e2e-ground.mjs", import.meta.url).href)) as { bestShift(a: ArrayLike<number>, b: ArrayLike<number>, w: number, h: number, reach: number): { x: number; y: number; error: number } };

/** A picture with no two neighbouring rows or columns alike, as grey values, shifted: what a ground looks like to the finder. */
function picture(w: number, h: number, dx: number, dy: number): number[] {
  const out: number[] = [];
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) out.push(((x - dx) * 37 + (y - dy) * 91 + ((x - dx) * (y - dy) * 13) % 97) % 251);
  return out;
}

test("the shared drag check finds how far a picture moved, in the right direction", () => {
  const w = 80;
  const h = 60;
  const before = picture(w, h, 0, 0);
  for (const [dx, dy] of [[0, 0], [7, 0], [-9, 0], [0, 5], [0, -6], [4, -3]] as const) {
    const found = ground.bestShift(before, picture(w, h, dx, dy), w, h, 12);
    assert.deepEqual([found.x, found.y], [dx, dy], `a picture moved by ${dx}, ${dy}`);
  }
});

test("the shared drag check is a copy for packages: no import but Playwright, and the drag rule's two checks are exported", () => {
  const text = readFileSync(new URL("../templates/e2e-ground.mjs", import.meta.url), "utf8");
  assert.deepEqual([...text.matchAll(/^import .* from "([^"]+)";$/gm)].map((one) => one[1]), ["@playwright/test"]);
  for (const name of ["checkFollowsTheHand", "checkExactGrab", "groundShift", "dragBy", "movedBy", "bestShift"]) assert.match(text, new RegExp(`export (async )?function ${name}\\b`));
});
