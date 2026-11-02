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
  check();
  return () => {
    observer?.disconnect();
    doc?.removeEventListener?.("visibilitychange", check);
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
