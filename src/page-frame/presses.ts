// A page with the frame asks the browser to treat a tap as a press: on an iPhone a quick second tap on a button zooms the page in, so a double tap on a demo's button never pressed twice. `touch-action: manipulation`
// on the document turns the double-tap zoom off for everything under it and leaves pinch zoom, scrolling and panning as they are. It is set on the document element, from a script (inline style set through the DOM, which
// a content security policy for styles does not stop), once for however many frame elements the page has, and put back when the last of them leaves. A page that sets its own `touch-action` on the document is left alone.

const held = new WeakMap<Document, { count: number; ours: boolean }>();

/** One frame element is on the document: ask for presses, not zooms. Returns the function that lets go. */
export function holdPresses(doc: Document): () => void {
  const root = doc.documentElement;
  let state = held.get(doc);
  if (state === undefined) {
    state = { count: 0, ours: false };
    held.set(doc, state);
  }
  if (state.count === 0) {
    const own = root.style.touchAction;
    const computed = doc.defaultView?.getComputedStyle(root).touchAction ?? "auto";
    if (own === "" && computed === "auto") {
      root.style.touchAction = "manipulation";
      state.ours = true;
    }
  }
  state.count += 1;
  const mine = state;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    mine.count -= 1;
    if (mine.count === 0 && mine.ours) {
      if (root.style.touchAction === "manipulation") root.style.removeProperty("touch-action");
      mine.ours = false;
    }
  };
}
