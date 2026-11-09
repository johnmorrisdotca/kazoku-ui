// The two type presets of a printed sheet. `kid` is for children in elementary and junior high school: large rounded type (names at 28 pt) and lines 3 mm thick. `normal` is for everyone else.
import type { TypeName } from "./pages.ts";

export interface TypePreset {
  /** The sheet's title. */
  titlePt: number;
  /** The names a sheet prints (a planet, a country), in `.kazoku-name`. Never under 24 pt for `kid`. */
  namePt: number;
  bodyPt: number;
  /** Credits, version, address: the fine print. */
  smallPt: number;
  /** How thick the sheet's own lines are (boxes, rules, the Name box). Never under 2.5 mm for `kid`. */
  lineMm: number;
  fontFamily: string;
}

const ROUNDED = 'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", Nunito, "M PLUS Rounded 1c", "Yu Gothic", system-ui, sans-serif';
const PLAIN = 'system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif';

export const TYPE_PRESETS: Record<TypeName, TypePreset> = {
  kid: { titlePt: 40, namePt: 28, bodyPt: 18, smallPt: 10, lineMm: 3, fontFamily: ROUNDED },
  normal: { titlePt: 24, namePt: 14, bodyPt: 11, smallPt: 8, lineMm: 0.4, fontFamily: PLAIN },
};
