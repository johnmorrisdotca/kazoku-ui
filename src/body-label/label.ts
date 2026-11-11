// The body's name written on its globe: one band of a sphere shell just above the surface, with one canvas texture holding every copy of the name, a child of the globe so
// it turns with it. three.js is the page's own, passed in. Nothing is drawn here: the host draws its scene as it does, and `update` says when the label changed.
import { bodyLabelFacing, bodyLabelLayout, type BodyLabelLayout, type BodyLabelRepeat, type BodyLabelSize } from "./layout.ts";

/** How the letters lie on the surface: pale paint (the default), a lightening etch, an outline, or burned in (darker). */
export type BodyLabelLook = "painted" | "etched" | "outline" | "burned";

/** The family's default font for a name on a globe, Michroma (SIL Open Font License 1.1), loaded by `loadBodyLabelFont`. */
export const BODY_LABEL_FONT = "Michroma";

/** What a name on a globe looks like and where it sits. Every setting is optional but `text`. */
export interface BodyLabelOptions {
  /** The name as it is to be written (pass capitals for the family's look: `EARTH`, `地球`). */
  text: string;
  /** A CSS font family the page has loaded. Default Michroma. */
  font?: string;
  /** The family for the letters `font` has none of (Japanese: `"Noto Sans JP"`). Default none: the page's sans (`system-ui`). */
  fallbackFont?: string;
  look?: BodyLabelLook;
  /** How strongly it shows, 0 to 1. Default 0.5. */
  strength?: number;
  repeat?: BodyLabelRepeat;
  /** The band's latitude in degrees; 0, the equator, is the default. */
  latitude?: number;
  /** Where the (first) name is centred, degrees east in the body's own frame. */
  longitude?: number;
  size?: BodyLabelSize;
  /** True: the name keeps facing the reader while the body turns under it. */
  facing?: boolean;
  /** The globe's radius in its mesh's own units. Default 1. */
  radius?: number;
  /** No label while the body is drawn smaller than this many CSS pixels in radius. Default 24. */
  minRadiusPx?: number;
}

/** The few shapes of three.js the label uses. Any three of the right shape fits; nothing here imports it. */
export interface BodyLabelThree {
  CanvasTexture: new (canvas: never) => { colorSpace: string; anisotropy: number; needsUpdate: boolean; dispose(): void };
  SphereGeometry: new (radius: number, widthSegments: number, heightSegments: number, phiStart: number, phiLength: number, thetaStart: number, thetaLength: number) => { dispose(): void };
  MeshLambertMaterial: new (parameters: Record<string, unknown>) => { opacity: number; blending: number; needsUpdate: boolean; dispose(): void };
  Mesh: new (geometry: never, material: never) => BodyLabelObject;
  Vector3: new () => { x: number; y: number; z: number };
  SRGBColorSpace: string;
  NormalBlending: number;
  AdditiveBlending: number;
}

/** What of the label's three `Mesh` a host touches. */
export interface BodyLabelObject {
  visible: boolean;
  name: string;
  renderOrder: number;
  rotation: { y: number };
  parent: { updateWorldMatrix(parents: boolean, children: boolean): void; worldToLocal(vector: never): unknown } | null;
  geometry: unknown;
}

/** A camera, as `update` reads it. */
export interface BodyLabelCamera {
  getWorldPosition(target: never): unknown;
}

/** The label `createBodyLabel` returns. */
export interface BodyLabel {
  /** The mesh: add it to the body's turning globe (`globe.add(label.object)`). */
  readonly object: BodyLabelObject;
  /** Resolves once the name is drawn in its own font (at once when the font is already loaded). Draw the view again then. */
  readonly ready: Promise<void>;
  /** The layout now: the band and each copy's place. */
  readonly layout: BodyLabelLayout;
  /** The settings now. */
  readonly options: Readonly<Required<BodyLabelOptions>>;
  /**
   * Call it before a draw, with the camera and the body's radius on screen in CSS pixels (left out: always shown). It hides the label below `minRadiusPx` and, with
   * `facing`, turns it to the camera. Returns true when something changed, so the host knows the view needs drawing. It allocates nothing and redraws no texture.
   */
  update(camera: BodyLabelCamera, radiusPx?: number): boolean;
  /** Change settings. The texture is drawn again only when the text, font, look, size, repeat, latitude or longitude changed; strength alone does not. */
  set(options: Partial<BodyLabelOptions>): void;
  /** Free the texture, the material and the geometry. Take the object out of the scene first. */
  dispose(): void;
}

/** Pixels of the texture across the whole circle: about 11 a degree. */
const TEXTURE_WIDTH = 4096;
/** The band is this much taller than the letters, so nothing is cut. */
const BAND = 1.4;
/** How far above the surface the shell is, as a share of the radius. */
const LIFT = 1.004;
const COLOURS: Readonly<Record<BodyLabelLook, string>> = { painted: "#f4efe2", etched: "#ffffff", outline: "#f4efe2", burned: "#1c140c" };
const DEFAULTS: Required<Omit<BodyLabelOptions, "text">> = { font: BODY_LABEL_FONT, fallbackFont: "", look: "painted", strength: 0.5, repeat: "once", latitude: 0, longitude: 0, size: "medium", facing: false, radius: 1, minRadiusPx: 24 };

const clamp01 = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : DEFAULTS.strength);
const fontOf = (family: string, px: number, fallback = ""): string => `${Math.round(px)}px ${[family, fallback].filter((one) => one !== "").map((one) => JSON.stringify(one)).join(", ")}, system-ui, sans-serif`;
const makeCanvas = (): HTMLCanvasElement | OffscreenCanvas => (typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(1, 1));

/**
 * Write a body's name on its globe. The label is a child of the globe, so it turns with it; with `facing` it turns back to the reader in `update`.
 *
 * @example
 * ```ts
 * import * as THREE from "three";
 * import { createBodyLabel, loadBodyLabelFont } from "@johnmorrisdotca/kazoku-ui/body-label";
 *
 * await loadBodyLabelFont();
 * const label = createBodyLabel(THREE, { text: "EARTH" });
 * globe.add(label.object);
 * label.ready.then(() => view.invalidate());
 * // each frame something moved: if (label.update(camera, radiusPx)) view.invalidate();
 * ```
 */
export function createBodyLabel(three: BodyLabelThree, options: BodyLabelOptions): BodyLabel {
  let settings: Required<BodyLabelOptions> = { ...DEFAULTS, ...withoutUndefined(options), text: String(options.text ?? ""), strength: clamp01(options.strength ?? DEFAULTS.strength) };
  const canvas = makeCanvas();
  const context = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  const texture = new three.CanvasTexture(canvas as never);
  texture.colorSpace = three.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new three.MeshLambertMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  let layout = bodyLabelLayout({ widthEm: 0 });
  let geometry: { dispose(): void } | undefined;
  const mesh = new three.Mesh(undefined as never, material as never);
  mesh.name = "body-label";
  mesh.renderOrder = 1;
  const camera = new three.Vector3();
  let disposed = false;

  function measure(): number {
    context.font = fontOf(settings.font, 100, settings.fallbackFont);
    return context.measureText(settings.text).width / 100;
  }

  function shape(): void {
    const top = layout.latitude + (layout.height * BAND) / 2;
    const span = layout.height * BAND;
    geometry?.dispose();
    geometry = new three.SphereGeometry(settings.radius * LIFT, 128, 4, 0, Math.PI * 2, ((90 - top) * Math.PI) / 180, (span * Math.PI) / 180);
    mesh.geometry = geometry;
  }

  function paint(): void {
    layout = bodyLabelLayout({ widthEm: measure(), latitude: settings.latitude, longitude: settings.longitude, repeat: settings.repeat, size: settings.size });
    const perDegree = TEXTURE_WIDTH / 360;
    const height = Math.max(8, Math.round(layout.height * BAND * perDegree));
    canvas.width = TEXTURE_WIDTH;
    canvas.height = height;
    context.clearRect(0, 0, TEXTURE_WIDTH, height);
    const px = layout.height * perDegree;
    context.font = fontOf(settings.font, px, settings.fallbackFont);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = COLOURS[settings.look];
    context.strokeStyle = COLOURS[settings.look];
    context.lineWidth = Math.max(1.5, px * 0.05);
    for (const one of layout.spans) {
      // the texture's left edge is longitude 180 (three's sphere starts its u at -x); a name across that seam is written at both ends
      const x = (((one.centre + 180) % 360) / 360) * TEXTURE_WIDTH;
      for (const at of [x - TEXTURE_WIDTH, x, x + TEXTURE_WIDTH]) {
        if (at + (one.width * perDegree) / 2 < 0 || at - (one.width * perDegree) / 2 > TEXTURE_WIDTH) continue;
        context.save();
        context.translate(at, height / 2);
        context.scale(layout.stretch, 1);
        if (settings.look === "outline") context.strokeText(settings.text, 0, 0);
        else context.fillText(settings.text, 0, 0);
        context.restore();
      }
    }
    texture.needsUpdate = true;
    shape();
  }

  function style(): void {
    material.blending = settings.look === "etched" ? three.AdditiveBlending : three.NormalBlending;
    material.opacity = settings.look === "etched" ? settings.strength * 0.6 : settings.strength;
    material.needsUpdate = true;
  }

  paint();
  style();
  if (!settings.facing) mesh.rotation.y = 0;

  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  const ready: Promise<void> =
    fonts === undefined || fonts.check(fontOf(settings.font, 16, settings.fallbackFont), settings.text)
      ? Promise.resolve()
      : fonts.load(fontOf(settings.font, 16, settings.fallbackFont), settings.text).then(
          () => {
            if (!disposed) paint();
          },
          () => undefined,
        );

  return {
    object: mesh,
    ready,
    get layout() {
      return layout;
    },
    get options() {
      return settings;
    },
    update(eye, radiusPx) {
      let changed = false;
      const show = radiusPx === undefined || radiusPx >= settings.minRadiusPx;
      if (mesh.visible !== show) {
        mesh.visible = show;
        changed = true;
      }
      if (!show || !settings.facing || mesh.parent === null) return changed;
      eye.getWorldPosition(camera as never);
      mesh.parent.updateWorldMatrix(true, false);
      mesh.parent.worldToLocal(camera as never);
      const turn = bodyLabelFacing(camera.x, camera.z, settings.longitude);
      if (Math.abs(mesh.rotation.y - turn) > 1e-6) {
        mesh.rotation.y = turn;
        changed = true;
      }
      return changed;
    },
    set(next) {
      const before = settings;
      settings = { ...settings, ...withoutUndefined(next), text: String(next.text ?? settings.text), strength: clamp01(next.strength ?? settings.strength) };
      const redraw = (["text", "font", "fallbackFont", "look", "size", "repeat", "latitude", "longitude", "radius"] as const).some((key) => settings[key] !== before[key]);
      if (redraw) paint();
      style();
      if (!settings.facing) mesh.rotation.y = 0;
    },
    dispose() {
      disposed = true;
      geometry?.dispose();
      material.dispose();
      texture.dispose();
      canvas.width = 1;
      canvas.height = 1;
    },
  };
}

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}
