// Where a floating window sits: inside the view, snapped to a corner or an edge. Nothing here touches the DOM.

export const VARIANTS = ["card", "shelf", "inspector"] as const;
export type Variant = (typeof VARIANTS)[number];

export const SNAPS = ["tl", "tr", "bl", "br", "left", "right", "top", "bottom", "free"] as const;
export type Snap = (typeof SNAPS)[number];

export interface ViewSize {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Place extends Point {
  snap: Snap;
}

/** The frame a page asked for. Anything else is the card. */
export function parseVariant(value: string | null | undefined): Variant {
  return (VARIANTS as readonly string[]).includes(value ?? "") ? (value as Variant) : "card";
}

const NAMED = SNAPS.filter((snap) => snap !== "free");

/** A remembered place: a corner or edge name, or `x,y` pixels. Anything else is nothing. */
export function parsePlace(value: string | null | undefined): { snap: Exclude<Snap, "free"> } | Point | null {
  if (!value) return null;
  const text = value.trim();
  if ((NAMED as readonly string[]).includes(text)) return { snap: text as Exclude<Snap, "free"> };
  const match = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(text);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

function edges(view: ViewSize, size: ViewSize): { maxX: number; maxY: number } {
  return { maxX: Math.max(0, view.width - size.width), maxY: Math.max(0, view.height - size.height) };
}

/** The top-left of a window sitting on a named corner or edge, held inside the view. */
export function namedPlace(view: ViewSize, size: ViewSize, snap: Snap): Point {
  const { maxX, maxY } = edges(view, size);
  switch (snap) {
    case "tl":
      return { x: 0, y: 0 };
    case "tr":
      return { x: maxX, y: 0 };
    case "bl":
      return { x: 0, y: maxY };
    case "br":
      return { x: maxX, y: maxY };
    case "left":
      return { x: 0, y: maxY / 2 };
    case "right":
      return { x: maxX, y: maxY / 2 };
    case "top":
      return { x: maxX / 2, y: 0 };
    case "bottom":
      return { x: maxX / 2, y: maxY };
    default:
      return { x: Math.min(16, maxX), y: Math.min(16, maxY) };
  }
}

/**
 * A window dragged to `at`, held inside the view. Within `snapPx` of an edge it sits on that edge, and on a corner when it is near two.
 * `snapPx` of 0 leaves it where the drag ended, still inside the view.
 */
export function settle(view: ViewSize, size: ViewSize, at: Point, snapPx = 28): Place {
  const { maxX, maxY } = edges(view, size);
  let x = clamp(at.x, 0, maxX);
  let y = clamp(at.y, 0, maxY);
  const nearL = x <= snapPx;
  const nearR = maxX - x <= snapPx;
  const nearT = y <= snapPx;
  const nearB = maxY - y <= snapPx;
  if (nearL && nearR) x = at.x <= maxX / 2 ? 0 : maxX;
  else if (nearL) x = 0;
  else if (nearR) x = maxX;
  if (nearT && nearB) y = at.y <= maxY / 2 ? 0 : maxY;
  else if (nearT) y = 0;
  else if (nearB) y = maxY;
  const left = x === 0 && maxX > 0;
  const right = x === maxX && maxX > 0;
  const top = y === 0 && maxY > 0;
  const bottom = y === maxY && maxY > 0;
  let snap: Snap = "free";
  if (left && top) snap = "tl";
  else if (right && top) snap = "tr";
  else if (left && bottom) snap = "bl";
  else if (right && bottom) snap = "br";
  else if (left) snap = "left";
  else if (right) snap = "right";
  else if (top) snap = "top";
  else if (bottom) snap = "bottom";
  return { x, y, snap };
}

export interface WindowContent {
  title: string;
  help: string;
  open: boolean;
}

/** The same title, help and open state in whichever frame the page picked. Only the presentation changes. */
export function frameOf(variant: Variant, content: WindowContent): WindowContent & { variant: Variant; presentation: "float" | "edge" | "wide" } {
  return {
    title: content.title,
    help: content.help,
    open: content.open,
    variant,
    presentation: variant === "shelf" ? "edge" : variant === "inspector" ? "wide" : "float",
  };
}

export const OPEN_KEY = "open";
export const PLACE_KEY = "place";

/** `open:ow,place:op` renames either key. A missing half keeps its own name. */
export function addressKeys(raw: string | null | undefined): { open: string; place: string } {
  const keys = { open: OPEN_KEY, place: PLACE_KEY };
  if (!raw) return keys;
  for (const part of raw.split(",")) {
    const [name, key] = part.split(":").map((piece) => piece.trim());
    if ((name === "open" || name === "place") && key) keys[name] = key;
  }
  return keys;
}
