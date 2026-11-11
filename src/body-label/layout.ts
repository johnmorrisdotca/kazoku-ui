// Where a body's name sits on its globe: the band of latitude it is written in and each copy's place along it, in degrees. Pure, no DOM and no three.js, so it is tested
// on its own and imports on a server. Longitude is the body's own, east positive, 0 where a map's middle is (three's SphereGeometry: +x, then towards -z going east).

/** How many times the name is written: once, twice on opposite sides, or as many times as fit all round. */
export type BodyLabelRepeat = "once" | "both" | "around";
/** The letters' height: small, medium (the default) or large. */
export type BodyLabelSize = "small" | "medium" | "large";

/** The letters' height in degrees of latitude for each size. */
export const BODY_LABEL_HEIGHTS: Readonly<Record<BodyLabelSize, number>> = { small: 9, medium: 14, large: 20 };
/** The farthest from the equator a name is written, in degrees: beyond it the letters would be stretched too far along a short circle. */
export const BODY_LABEL_MAX_LATITUDE = 70;

/** What the layout needs: the text's width in ems (from the page's font), and the settings. */
export interface BodyLabelLayoutInput {
  /** The text's width over its font size, as the font draws it (`measureText(text).width / fontPx`). */
  widthEm: number;
  /** The middle of the band, degrees; 0 is the equator. Kept within ±70. */
  latitude?: number;
  /** Where the (first) name is centred, degrees east. */
  longitude?: number;
  repeat?: BodyLabelRepeat;
  size?: BodyLabelSize;
}

/** One copy of the name on the globe. */
export interface BodyLabelSpan {
  /** Its middle, degrees east, within [0, 360). */
  centre: number;
  /** How far it runs along the band, degrees of longitude. */
  width: number;
}

/** The band and the copies in it. */
export interface BodyLabelLayout {
  /** The band's middle, degrees. */
  latitude: number;
  /** The letters' height, degrees of latitude (an em: the font size). */
  height: number;
  /** How much wider than on the equator a degree of text is drawn here, so the letters keep their shape on the shorter circle: 1 / cos(latitude). */
  stretch: number;
  spans: BodyLabelSpan[];
}

const wrap360 = (degrees: number): number => ((degrees % 360) + 360) % 360;
/** The space between two copies all round, in ems. */
const GAP_EM = 1.5;

/**
 * Lay the name out on the globe. A name too long for its share of the circle is made smaller until it fits, so two copies never meet.
 *
 * @example
 * ```ts
 * import { bodyLabelLayout } from "@johnmorrisdotca/kazoku-ui/body-label";
 *
 * const layout = bodyLabelLayout({ widthEm: 4.2, repeat: "both" });
 * console.log(layout.height, layout.spans.map((span) => span.centre)); // 14 [0, 180]
 * ```
 */
export function bodyLabelLayout(input: BodyLabelLayoutInput): BodyLabelLayout {
  const widthEm = Math.max(0, Number.isFinite(input.widthEm) ? input.widthEm : 0);
  const latitude = Math.max(-BODY_LABEL_MAX_LATITUDE, Math.min(BODY_LABEL_MAX_LATITUDE, Number.isFinite(input.latitude) ? input.latitude! : 0));
  const longitude = Number.isFinite(input.longitude) ? input.longitude! : 0;
  const repeat = input.repeat ?? "once";
  const stretch = 1 / Math.cos((latitude * Math.PI) / 180);
  let height = BODY_LABEL_HEIGHTS[input.size ?? "medium"];
  // a degree of height is a degree of arc; along the band an em of text is `stretch` degrees of longitude for each degree of height
  const along = (h: number, em: number): number => em * h * stretch;
  const share = repeat === "both" ? 180 : 360;
  // the name and a gap must fit in its share of the circle
  const room = share - (repeat === "once" ? 0 : along(height, GAP_EM));
  if (along(height, widthEm) > room && widthEm > 0) height *= room / along(height, widthEm);
  const width = along(height, widthEm);
  let count = repeat === "once" ? 1 : repeat === "both" ? 2 : Math.max(1, Math.floor(360 / (width + along(height, GAP_EM))));
  if (widthEm === 0) count = 0;
  const spans = Array.from({ length: count }, (_, i) => ({ centre: wrap360(longitude + (360 * i) / count), width }));
  return { latitude, height, stretch, spans };
}

/**
 * For a name that keeps facing the reader: the turn about the body's axis, in radians, that brings the name's middle (`longitude`) round to the camera, given the camera's
 * place in the globe's own frame (x and z; y is the axis). Turning the label by this about +y puts its middle on the camera's side.
 *
 * @example
 * ```ts
 * import { bodyLabelFacing } from "@johnmorrisdotca/kazoku-ui/body-label";
 *
 * // the camera straight out along -z, which is 90 degrees east: a name centred at 0 turns a quarter round
 * console.log(Math.round((bodyLabelFacing(0, -5, 0) * 180) / Math.PI)); // 90
 * ```
 */
export function bodyLabelFacing(x: number, z: number, longitude = 0): number {
  const camera = Math.atan2(-z, x);
  const turn = camera - (longitude * Math.PI) / 180;
  return Math.atan2(Math.sin(turn), Math.cos(turn));
}
