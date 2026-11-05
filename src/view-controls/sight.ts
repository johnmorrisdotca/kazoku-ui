// Whether anyone can see a view: on screen (an IntersectionObserver) in a visible tab. It touches the browser only when called, so it imports on a server.
import type { ViewController } from "./controller.ts";

/**
 * Calls `tell` with whether `target` can be seen, at once and on every change. Until the observer has answered the view counts as not seen, so a view that opens off screen
 * never asks for a frame. Without `IntersectionObserver` it counts as on screen. Returns a function that stops watching.
 */
export function watchSight(target: Element, tell: (seen: boolean) => void): () => void {
  const doc = target.ownerDocument as Document | undefined;
  let onScreen = typeof IntersectionObserver !== "function";
  let told: boolean | undefined;
  const check = (): void => {
    const seen = onScreen && doc?.visibilityState !== "hidden";
    if (seen === told) return;
    told = seen;
    tell(seen);
  };
  const observer = onScreen
    ? undefined
    : new IntersectionObserver((entries) => {
        const latest = entries[entries.length - 1];
        if (latest === undefined) return;
        onScreen = latest.isIntersecting;
        check();
      });
  observer?.observe(target);
  doc?.addEventListener?.("visibilitychange", check);
  // A scroll is told at once, in the scroll itself, so the queued frame can be cancelled before it runs. The observer agrees on the next rendering step, which can be a frame later, and that one frame would be a turn nobody can see.
  const onScroll = (): void => {
    const view = doc?.defaultView;
    if (view === undefined || view === null) return;
    const r = target.getBoundingClientRect();
    onScreen = r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < view.innerHeight && r.left < view.innerWidth;
    check();
  };
  doc?.addEventListener?.("scroll", onScroll, true);
  doc?.defaultView?.addEventListener?.("scroll", onScroll);
  // Inserting above the view moves it off screen without a scroll event (the page was already at the top). The observer would only say so on the next frame, after the queued turn had run.
  const body = doc?.body;
  const mutations = typeof MutationObserver === "function" && body !== undefined && body !== null ? new MutationObserver(onScroll) : undefined;
  if (mutations !== undefined && body !== undefined && body !== null) mutations.observe(body, { childList: true });
  check();
  // The first answer from the observer arrives in a rendering step. With the turn already held, nothing else asks for a frame, and a browser that skips rendering while the page is idle never delivers it. A task that reads the rectangle starts a turn that is already on screen, and asks for no frame when it is not.
  const soon = doc?.defaultView?.setTimeout(onScroll, 0);
  return () => {
    if (soon !== undefined) doc?.defaultView?.clearTimeout(soon);
    observer?.disconnect();
    doc?.removeEventListener?.("visibilitychange", check);
    doc?.removeEventListener?.("scroll", onScroll, true);
    doc?.defaultView?.removeEventListener?.("scroll", onScroll);
    mutations?.disconnect();
  };
}

/** Stops the controller's frame loop while `target` cannot be seen, and lets it go on when it can. Returns a function that stops watching and takes its hold off. */
export function turnOnlyInSight(controller: Pick<ViewController, "suspendTurn" | "resumeTurn">, target: Element): () => void {
  let held = false;
  const stop = watchSight(target, (seen) => {
    if (held === !seen) return;
    held = !seen;
    if (held) controller.suspendTurn();
    else controller.resumeTurn();
  });
  return () => {
    stop();
    if (held) controller.resumeTurn();
    held = false;
  };
}
