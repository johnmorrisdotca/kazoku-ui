// How far a picture moved: the shift that best matches one grey image to the next. Pure arithmetic on numbers, kept apart from the Playwright steps. Moved out of gestures.ts as it was; gestures.ts re-exports it.

/** The best shift of `after` against `before` (grey values, row by row, `w` by `h`): slide a window of `before` over `after` up to `reach` pixels each way. `zero` is how different they are with no shift. */
export function bestShift(before: ArrayLike<number>, after: ArrayLike<number>, w: number, h: number, reach: number, window: [number, number, number, number] = [0.3, 0.7, 0.3, 0.7]): { x: number; y: number; error: number; zero: number } {
  const x0 = Math.round(w * window[0]);
  const x1 = Math.round(w * window[1]);
  const y0 = Math.round(h * window[2]);
  const y1 = Math.round(h * window[3]);
  const order: [number, number][] = [];
  for (let dy = -reach; dy <= reach; dy += 1) for (let dx = -reach; dx <= reach; dx += 1) order.push([dx, dy]);
  order.sort((a, b) => Math.abs(a[0]) + Math.abs(a[1]) - Math.abs(b[0]) - Math.abs(b[1]));
  const most = Math.ceil((y1 - y0) / 3) * Math.ceil((x1 - x0) / 3);
  const errorAt = (dx: number, dy: number, limit: number): number => {
    let sum = 0;
    let n = 0;
    for (let y = y0; y < y1; y += 3) {
      const ys = y + dy;
      if (ys < 0 || ys >= h) continue;
      for (let x = x0; x < x1; x += 3) {
        const xs = x + dx;
        if (xs < 0 || xs >= w) continue;
        sum += Math.abs(before[y * w + x]! - after[ys * w + xs]!);
        n += 1;
      }
      if (sum / most > limit) return Infinity;
    }
    return n === 0 ? Infinity : sum / n;
  };
  let best = { x: 0, y: 0, error: Infinity };
  let bestAt = Infinity;
  for (const [dx, dy] of order) {
    const error = errorAt(dx, dy, best.error);
    const at = (dy + reach) * (2 * reach + 1) + dx + reach;
    if (error < best.error || (error === best.error && at < bestAt)) {
      best = { x: dx, y: dy, error };
      bestAt = at;
    }
  }
  return { ...best, zero: errorAt(0, 0, Infinity) };
}
