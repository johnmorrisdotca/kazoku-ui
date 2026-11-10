// The maths of the shared scene, pure and in float64: the floating origin, the orbit camera, the two depth slices, and a Sun for a host that has none of its own.
import type { Object3DLike, SceneFrame, Vec3Km } from "./types.ts";

/** The astronomical unit in kilometres. */
export const AU_KM = 149_597_870.7;
/** Where a layer's sky sits, in scene units from the origin (the host's sky camera sees 1 to 1000). */
export const SKY_RADIUS = 100;
/** The sky camera's near and far planes. */
export const SKY_NEAR = 1;
export const SKY_FAR = 1000;

const rad = (degrees: number): number => (degrees * Math.PI) / 180;

/** `a - b`. */
export const subKm = (a: Vec3Km, b: Vec3Km): Vec3Km => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
/** The length of an offset. */
export const lengthKm = (a: Vec3Km): number => Math.hypot(a[0], a[1], a[2]);

/**
 * Put an object where a body is, relative to the frame's floating origin: `position = (place - focus) / unit`, `scale = sizeKm / unit`. The one line each layer writes, so none of them
 * can bake an absolute coordinate into geometry.
 *
 * @param object - The body's root.
 * @param placeKm - Where its centre is, in the SPX frame, in kilometres.
 * @param frame - This frame.
 * @param sizeKm - What one unit of the object's own size is, in kilometres (1 when the geometry is built in kilometres; the radius when it is built with radius 1).
 * @returns The position given to the object, in scene units.
 */
export function placeInFrame(object: Object3DLike, placeKm: Vec3Km, frame: Pick<SceneFrame, "focusKm" | "unitKm">, sizeKm = 1): Vec3Km {
  const at: Vec3Km = [(placeKm[0] - frame.focusKm[0]) / frame.unitKm, (placeKm[1] - frame.focusKm[1]) / frame.unitKm, (placeKm[2] - frame.focusKm[2]) / frame.unitKm];
  object.position.set(at[0], at[1], at[2]);
  object.scale.setScalar(sizeKm / frame.unitKm);
  return at;
}

/**
 * Where the camera is, as an offset from what it looks at: `distanceKm` away, `yaw` degrees round the north axis (0 looks from +z), `tilt` degrees above the equator.
 *
 * @param distanceKm - How far from the centre, in kilometres.
 * @param yawDeg - Degrees round y.
 * @param tiltDeg - Degrees above the xz plane, held between -89 and 89.
 * @returns The offset, in kilometres.
 */
export function orbitOffsetKm(distanceKm: number, yawDeg: number, tiltDeg: number): Vec3Km {
  const tilt = rad(Math.max(-89, Math.min(89, tiltDeg)));
  const yaw = rad(yawDeg);
  return [distanceKm * Math.cos(tilt) * Math.sin(yaw), distanceKm * Math.sin(tilt), distanceKm * Math.cos(tilt) * Math.cos(yaw)];
}

/** How far from a body's centre a camera must be for the whole body to fill the view across, in kilometres (a little beyond, so it does not touch the edge). */
export function fitDistanceKm(radiusKm: number, fovDeg: number, margin = 1.15): number {
  return (radiusKm * margin) / Math.sin(rad(Math.max(1, fovDeg)) / 2);
}

/** One body as the depth planner sees it. */
export interface SliceBody {
  id: string;
  /** From the camera to the body's centre, in kilometres. */
  distanceKm: number;
  radiusKm: number;
}

/** A range of the camera's depth that some bodies are drawn in, with the depth buffer cleared before it. */
export interface DepthSlice {
  ids: readonly string[];
  /** The near and far planes of this pass, in kilometres. */
  nearKm: number;
  farKm: number;
}

/** What `planSlices` is held to. */
export interface SliceOptions {
  /** A body belongs to the near slice when its nearest surface is within this many times the nearest surface of all (1000). */
  ratio?: number;
  /** The nearest a near plane may be, in kilometres (0.00001, a centimetre). */
  minNearKm?: number;
}

/**
 * Two depth slices, not a logarithmic depth buffer (which a custom shader does not follow without editing). The bodies are dealt into a near slice (those whose nearest surface is within `ratio`
 * times the nearest surface of all) and a far slice (the rest); the far one is drawn first, the depth buffer is cleared, and the near one is drawn over it. Each slice's planes are set from the
 * bodies in it: the near plane half the nearest surface, the far plane just past the farthest edge, so no body is cut, and the ratio of far to near stays within what a 24-bit depth buffer
 * resolves. From 400 km above the Earth with the camera a few metres from a rocket, the rocket is the near slice and the Earth and the Moon are the far one; a kilometre back, the rocket
 * and the Earth share the near slice and only the Moon is far.
 * A body is drawn whole in one slice, so the near slice always draws over the far one: a body behind a nearer one in another slice is never hidden by it.
 *
 * @param bodies - Each body's distance from the camera and radius.
 * @param options - The ratio and the nearest near plane.
 * @returns The slices, far first, one or two (none for no bodies).
 * @example
 * planSlices([{ id: "rocket", distanceKm: 0.05, radiusKm: 0.01 }, { id: "earth", distanceKm: 6778, radiusKm: 6378 }]);
 * // far first: [{ ids: ["earth"], nearKm: 200, farKm: 13_200 }, { ids: ["rocket"], nearKm: 0.02, farKm: 0.06 }] (the planes rounded)
 */
export function planSlices(bodies: readonly SliceBody[], options: SliceOptions = {}): DepthSlice[] {
  if (bodies.length === 0) return [];
  const ratio = options.ratio ?? 1000;
  const floor = options.minNearKm ?? 1e-5;
  const surface = (b: SliceBody): number => Math.max(b.distanceKm - b.radiusKm, 0);
  const nearest = Math.max(Math.min(...bodies.map(surface)), floor * 2);
  const near = bodies.filter((b) => surface(b) <= nearest * ratio);
  const far = bodies.filter((b) => surface(b) > nearest * ratio);
  const slice = (group: readonly SliceBody[]): DepthSlice => {
    const nearKm = Math.max(Math.min(...group.map(surface)) * 0.5, floor);
    const farKm = Math.max(...group.map((b) => b.distanceKm + b.radiusKm)) * 1.01 + nearKm;
    return { ids: group.map((b) => b.id), nearKm, farKm };
  };
  return far.length === 0 ? [slice(near)] : [slice(far), slice(near)];
}

/**
 * Where the Sun is, geocentric, in the SPX frame, in kilometres: the Astronomical Almanac's low-precision formula (about 0.01 degrees from 1950 to 2050). A host with wakusei-planets' `frameAt`
 * passes that as the scene's `sun` instead; this is what a page without it gets.
 *
 * @param ms - The moment, in milliseconds since 1970.
 * @returns The Sun's place.
 */
export function lowPrecisionSun(ms: number): Vec3Km {
  const n = ms / 86_400_000 - 10_957.5; // days from J2000.0 (2000-01-01 12:00 UTC)
  const meanLongitude = rad(280.46 + 0.9856474 * n);
  const anomaly = rad(357.528 + 0.9856003 * n);
  const longitude = meanLongitude + rad(1.915) * Math.sin(anomaly) + rad(0.02) * Math.sin(2 * anomaly);
  const distanceAu = 1.00014 - 0.01671 * Math.cos(anomaly) - 0.00014 * Math.cos(2 * anomaly);
  const obliquity = rad(23.439 - 0.0000004 * n);
  const r = distanceAu * AU_KM;
  const x = r * Math.cos(longitude);
  const yEquatorial = r * Math.cos(obliquity) * Math.sin(longitude);
  const zEquatorial = r * Math.sin(obliquity) * Math.sin(longitude);
  return [x, zEquatorial, -yEquatorial];
}
