// Asks the page's source one question at a time and keeps only the newest answer. Nothing here touches the DOM, so it runs on a server, and a test turns its clock by hand.
import type { SearchGroup, SearchSource } from "./model.ts";

/** A timer the runner can be given, for a test that turns time by hand. */
export interface SearchTimers {
  set(run: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export interface SearchRunnerOptions {
  /** The page's source, read at each call so a page can replace it. */
  source: () => SearchSource | undefined;
  /** Quiet time after the last keystroke before the source is asked, in ms. 0 asks at once. */
  debounceMs: number;
  /** Called when a call to the source starts. */
  onStart?: (query: string, group: string) => void;
  /** Called with the answer to the newest call, and never with an older one. */
  onAnswer: (groups: readonly SearchGroup[], query: string, group: string) => void;
  /** Called when the newest call failed. An aborted or replaced call is not a failure. */
  onFail?: (error: unknown, query: string, group: string) => void;
  /** Called when the newest call has ended, answered or failed. */
  onIdle?: () => void;
  /** Left out, `setTimeout` and `clearTimeout`. */
  timers?: SearchTimers;
}

/** What `createSearchRunner` returns. */
export interface SearchRunner {
  /** Ask for `query` after the quiet time, replacing a request that is still waiting. `immediate` skips the wait. */
  request(query: string, group?: string, immediate?: boolean): void;
  /** Drop the waiting request and abort the one in flight. Neither answers. */
  cancel(): void;
  /** True while a request waits or a call is in flight. */
  readonly busy: boolean;
}

const realTimers: SearchTimers = { set: (run, ms) => setTimeout(run, ms), clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>) };

/**
 * The stale guard. Each call to the source gets its own `AbortController`; a new request aborts the one before it, and an answer that arrives after a newer call has started is
 * dropped whether or not the source heard the abort. The source is never called by itself: only `request` calls it, and an empty query is the caller's to skip.
 *
 * @example
 * const runner = createSearchRunner({ source: () => mySource, debounceMs: 120, onAnswer: (groups) => draw(groups) });
 * runner.request("mars");
 */
export function createSearchRunner(options: SearchRunnerOptions): SearchRunner {
  const timers = options.timers ?? realTimers;
  let waiting: unknown;
  let hasWaiting = false;
  let serial = 0;
  let controller: AbortController | undefined;
  let inFlight = false;

  const run = async (query: string, group: string): Promise<void> => {
    const source = options.source();
    if (source === undefined) return;
    controller?.abort();
    const mine = ++serial;
    const own = new AbortController();
    controller = own;
    inFlight = true;
    options.onStart?.(query, group);
    try {
      const groups = await source(query, { signal: own.signal, group });
      if (mine !== serial || own.signal.aborted) return;
      inFlight = false;
      options.onAnswer(groups, query, group);
      options.onIdle?.();
    } catch (error) {
      if (mine !== serial || own.signal.aborted) return;
      inFlight = false;
      options.onFail?.(error, query, group);
      options.onIdle?.();
    }
  };

  const clearWaiting = (): void => {
    if (hasWaiting) timers.clear(waiting);
    hasWaiting = false;
  };

  return {
    request(query, group = "", immediate = false) {
      clearWaiting();
      if (immediate || options.debounceMs <= 0) {
        void run(query, group);
        return;
      }
      hasWaiting = true;
      waiting = timers.set(() => {
        hasWaiting = false;
        void run(query, group);
      }, options.debounceMs);
    },
    cancel() {
      clearWaiting();
      serial += 1;
      controller?.abort();
      controller = undefined;
      inFlight = false;
    },
    get busy() {
      return hasWaiting || inFlight;
    },
  };
}
