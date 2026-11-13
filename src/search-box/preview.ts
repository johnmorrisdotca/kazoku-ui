// Gets the preview of the row the reader has highlighted, one at a time, and never for any other row. Nothing here touches the DOM, so it runs on a server, and a test turns its clock by hand.
import type { SearchPreview, SearchPreviewSource, SearchRow } from "./model.ts";
import { sanitizePreview } from "./preview-view.ts";
import type { SearchTimers } from "./runner.ts";

/** What the loader reports about a row: the cache key it was highlighted with, the row and its group's id. */
export interface PreviewTarget {
  key: string;
  row: SearchRow;
  group: string;
}

export interface PreviewLoaderOptions {
  /** The page's function for rows that carry no preview of their own, read at each call so a page can replace it. */
  fallback: () => SearchPreviewSource | undefined;
  /** Quiet time after a row is highlighted before its preview is asked for, in ms. Moving through rows with the arrows asks for none of the rows passed. */
  debounceMs: number;
  /** How long a request may take before `onStale` is called, in ms, so the pane can show that what it has is the last row's. */
  staleMs: number;
  /** The most previews kept (the oldest used goes first). */
  cacheSize: number;
  /** Called with the preview to draw: from the cache, from the row, or from the function. `preview` is `undefined` when nothing more is known or the request failed (`failed`). Never called with an older row's answer. */
  onShow: (target: PreviewTarget, preview: SearchPreview | undefined, failed: boolean) => void;
  /** Called when a request is made, so the pane can say it is waiting. */
  onWait?: (target: PreviewTarget) => void;
  /** Called when the request is still unanswered after `staleMs`. */
  onStale?: (target: PreviewTarget) => void;
  /** Left out, `setTimeout` and `clearTimeout`. */
  timers?: SearchTimers;
}

/** What `createPreviewLoader` returns. */
export interface PreviewLoader {
  /** The reader's highlight is on this row. Shows its preview at once when the row carries it or the cache has it, otherwise asks for it after the quiet time. The same row again changes nothing. */
  highlight(key: string, row: SearchRow, group: string): void;
  /** Drop the waiting request and abort the one in flight; neither shows. The cache stays. */
  cancel(): void;
  /** Cancel, and forget every kept preview (the page's data or language changed). */
  clear(): void;
  /** How many times the page's function was called. A test aid. */
  readonly calls: number;
  /** How many previews are kept. */
  readonly size: number;
}

const realTimers: SearchTimers = { set: (run, ms) => setTimeout(run, ms), clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>) };

/**
 * The preview loader. A row that carries its preview (an object) shows it at once. A row that carries a function, or the page's `fallback`, is asked after the quiet time and only if it is still the highlighted row; the request has its own `AbortController`
 * and moving to another row aborts it; an answer that arrives after another row was highlighted is dropped. Answers are kept by key (the oldest used go first), so a row highlighted again shows at once and asks for nothing. The pane keeps what it shows until
 * the next answer: nothing is called while a request is out except `onWait` and, later, `onStale`. A failed request is shown as no preview and is not kept; the row is asked for again when it is highlighted after another row, not by a repeat of the same highlight.
 *
 * @example
 * const loader = createPreviewLoader({ fallback: () => async (row) => ({ facts: [{ label: "Id", value: row.id }] }), debounceMs: 150, staleMs: 300, cacheSize: 100, onShow: (target, preview) => draw(target.row, preview) });
 * loader.highlight("planets\u0000mars", { id: "mars", label: "Mars" }, "planets");
 */
export function createPreviewLoader(options: PreviewLoaderOptions): PreviewLoader {
  const timers = options.timers ?? realTimers;
  const cache = new Map<string, SearchPreview | undefined>();
  let waiting: unknown;
  let hasWaiting = false;
  let staleTimer: unknown;
  let hasStale = false;
  let serial = 0;
  let controller: AbortController | undefined;
  let current: string | undefined;
  let calls = 0;

  const clearTimers = (): void => {
    if (hasWaiting) timers.clear(waiting);
    if (hasStale) timers.clear(staleTimer);
    hasWaiting = false;
    hasStale = false;
  };

  const keep = (key: string, preview: SearchPreview | undefined): void => {
    cache.delete(key);
    cache.set(key, preview);
    while (cache.size > Math.max(1, options.cacheSize)) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  };

  const ask = async (target: PreviewTarget, load: SearchPreviewSource, mine: number): Promise<void> => {
    controller?.abort();
    const own = new AbortController();
    controller = own;
    calls += 1;
    let preview: SearchPreview | undefined;
    let failed = false;
    // only the page's function is inside the try: what is done with its answer is not a failure of the load
    try {
      preview = sanitizePreview(await load(target.row, { signal: own.signal, group: target.group }));
    } catch {
      failed = true;
    }
    if (mine !== serial || own.signal.aborted) return;
    // a call that has ended is not aborted later: the next highlight has nothing of it to stop
    if (controller === own) controller = undefined;
    clearTimers();
    // an answer is kept in its checked form; a failure is shown and not kept, and the row is asked for again only after another row has been highlighted
    if (!failed) keep(target.key, preview);
    options.onShow(target, preview, failed);
  };

  const cancel = (): void => {
    clearTimers();
    serial += 1;
    controller?.abort();
    controller = undefined;
    current = undefined;
  };

  return {
    highlight(key, row, group) {
      if (key === current) return;
      clearTimers();
      controller?.abort();
      serial += 1;
      const mine = serial;
      current = key;
      const target: PreviewTarget = { key, row, group };
      const own = row.preview;
      // a preview the row carries is shown as it is each time, and is not kept: the page may send a newer one with its next answer
      if (own !== undefined && typeof own !== "function") {
        options.onShow(target, sanitizePreview(own), false);
        return;
      }
      if (cache.has(key)) {
        const kept = cache.get(key);
        keep(key, kept);
        options.onShow(target, kept, false);
        return;
      }
      const load = typeof own === "function" ? own : options.fallback();
      if (load === undefined) {
        options.onShow(target, undefined, false);
        return;
      }
      options.onWait?.(target);
      hasStale = true;
      staleTimer = timers.set(() => {
        hasStale = false;
        if (mine === serial) options.onStale?.(target);
      }, options.staleMs);
      hasWaiting = true;
      waiting = timers.set(() => {
        hasWaiting = false;
        // an error of the caller's own (in onShow) is reported to the page as any uncaught error is, and is not a failed load
        ask(target, load, mine).catch((error: unknown) => (globalThis as { reportError?: (error: unknown) => void }).reportError?.(error));
      }, Math.max(0, options.debounceMs));
    },
    cancel,
    clear() {
      cancel();
      cache.clear();
    },
    get calls() {
      return calls;
    },
    get size() {
      return cache.size;
    },
  };
}
