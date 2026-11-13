// One frame loop for every view on the page. A view is drawn only when it asked to be (`invalidate`), so a page at rest asks the browser for nothing;
// exactly one animation frame is requested at a time, whoever invalidates and whenever (a change event during a draw adds nothing, which is the fault that once
// doubled a package's frame requests every frame); a frame has a budget (draws and milliseconds), with the focused view first and ambient work shed first;
// and a view is drawn at most MAX_FPS times a second, whatever the screen's refresh rate, so a turning view costs the same battery on a 60, 120 or 144 Hz screen.

/** Most draws of one job in a second (30): the family's rule for live 3D. A 60 Hz screen draws every second frame, a 120 Hz screen every fourth. */
export const MAX_FPS = 30;
// A frame's timestamp is not exact: a gap a little short of a whole number of frames still counts, so 60 Hz gives 30 draws and not 20.
const TOLERANCE_MS = 2;
const GAP_MS = 1000 / MAX_FPS - TOLERANCE_MS;
// The gap alone lets a screen whose frame is a little under half of 33.3 ms (62.5 Hz: 16 ms) draw every second frame, 31.25 a second. So no job is also drawn a 31st time inside a second: the 30th draw back must be a second ago, less the same tolerance.
const WINDOW_MS = 1000 - TOLERANCE_MS;

export interface FrameClock {
  request(callback: (now: number) => void): number;
  cancel(id: number): void;
  now(): number;
}

export const browserClock = (): FrameClock => ({
  request: (callback) => globalThis.requestAnimationFrame(callback),
  cancel: (id) => globalThis.cancelAnimationFrame(id),
  now: () => globalThis.performance.now(),
});

export interface Job {
  /** Draw once. `dt` is seconds since this job's last draw while it kept animating, else 0. A job is drawn at most `MAX_FPS` times a second: one asked for sooner waits for the frame that is a gap after its last draw. Return true to be drawn again next frame (an animation); anything else leaves it at rest. */
  draw(now: number, dt: number): boolean | void;
}

export type Priority = "focus" | "ambient";

export interface SchedulerOptions {
  clock?: FrameClock;
  /** Most jobs drawn in one frame (2). */
  maxDraws?: number;
  /** Milliseconds after which no further job is started in a frame (10). A job already started is finished. */
  budgetMs?: number;
}

export interface SchedulerStats {
  /** Animation frames asked for. */
  requests: number;
  /** Frames that ran. */
  frames: number;
  /** Jobs drawn. */
  draws: number;
  /** Jobs left for the next frame because the budget was spent. */
  deferred: number;
}

export interface Scheduler {
  /** Ask for a draw. Asking again before it happens changes nothing. */
  invalidate(job: Job, priority?: Priority): void;
  /** Forget a job (a view that is gone). */
  remove(job: Job): void;
  /** Stop asking for frames (nothing can see the views). Counts, so pauses nest. Drawing resumes when the last is undone. */
  pause(): void;
  resume(): void;
  readonly paused: boolean;
  /** True while a frame is requested and has not run yet. */
  readonly pending: boolean;
  readonly stats: SchedulerStats;
}

export function createScheduler(options: SchedulerOptions = {}): Scheduler {
  const clock = options.clock ?? browserClock();
  const maxDraws = options.maxDraws ?? 2;
  const budgetMs = options.budgetMs ?? 10;
  const dirty = new Map<Job, Priority>();
  const lastDraw = new Map<Job, number>();
  // When each job last drew, whether or not it asked to go on: the cap holds for a view invalidated by a hand's every move as much as for an animation.
  let drewAt = new WeakMap<Job, number>();
  // The times of each job's last MAX_FPS draws, oldest first: the count in any second.
  const recent = new WeakMap<Job, number[]>();
  const allowed = (job: Job, now: number): boolean => {
    if (now - (drewAt.get(job) ?? -Infinity) < GAP_MS) return false;
    const times = recent.get(job);
    return times === undefined || times.length < MAX_FPS || now - times[times.length - MAX_FPS]! >= WINDOW_MS;
  };
  const stats: SchedulerStats = { requests: 0, frames: 0, draws: 0, deferred: 0 };
  let frame = 0;
  let running = false;
  let pauses = 0;

  // The only place a frame is asked for, and it asks only if none is.
  const ensure = (): void => {
    if (frame !== 0 || running || pauses > 0 || dirty.size === 0) return;
    stats.requests += 1;
    frame = clock.request(run);
  };

  function run(now: number): void {
    frame = 0;
    running = true;
    stats.frames += 1;
    const started = clock.now();
    // A job that drew less than a gap ago stays dirty and is left alone this frame (another frame is asked for below); one at rest draws at once.
    const order = [...dirty]
      .filter(([job]) => allowed(job, now))
      .sort((a, b) => Number(a[1] === "ambient") - Number(b[1] === "ambient"));
    let drawn = 0;
    try {
      for (const [job, priority] of order) {
        if (drawn >= maxDraws || (drawn > 0 && clock.now() - started > budgetMs)) {
          stats.deferred += order.length - drawn;
          break;
        }
        dirty.delete(job);
        drewAt.set(job, now);
        const times = recent.get(job) ?? [];
        times.push(now);
        if (times.length > MAX_FPS) times.shift();
        recent.set(job, times);
        const before = lastDraw.get(job);
        const dt = before === undefined ? 0 : Math.min(0.1, (now - before) / 1000);
        drawn += 1;
        stats.draws += 1;
        if (job.draw(now, dt) === true) {
          lastDraw.set(job, now);
          dirty.set(job, priority);
        } else lastDraw.delete(job);
      }
    } finally {
      running = false;
      ensure();
    }
  }

  return {
    invalidate(job, priority = "focus") {
      if (!dirty.has(job)) dirty.set(job, priority);
      ensure();
    },
    remove(job) {
      dirty.delete(job);
      lastDraw.delete(job);
      drewAt.delete(job);
      recent.delete(job);
    },
    pause() {
      pauses += 1;
      if (frame !== 0) {
        clock.cancel(frame);
        frame = 0;
      }
    },
    resume() {
      if (pauses === 0) return;
      pauses -= 1;
      // Time spent paused is not a frame's worth of animation.
      if (pauses === 0) {
        lastDraw.clear();
        drewAt = new WeakMap();
      }
      ensure();
    },
    get paused() {
      return pauses > 0;
    },
    get pending() {
      return frame !== 0;
    },
    stats,
  };
}
