// The interface's tokens in one place: the colours, the type and the radii, as one table, as CSS custom properties, and as the contrast rule they must keep.
// Nothing here touches the DOM until `installTokens` is given a document, so it imports on a server and in a build script.
// Dark is the default. Every part reads these as `var(--kui-name, fallback)`, so a page that never installs them still gets them, and a page that sets one overrides it.

/** The colours, as the design gives them. Text and icons on every ground below pass 4.5:1 (a test holds that). */
export const COLOURS = {
  /** Behind a 3D or sky view. */
  space: "#070A10",
  /** Behind a reading page. */
  page: "#0B0E14",
  /** Bars, cards, panels and fields. */
  panel: "#121722",
  /** 1 px borders, dividers, and the fill of an active or pressed control. */
  line: "#232B3A",
  /** The border of an outlined button, and orbit lines. */
  "line-strong": "#3A4860",
  /** Main text and icons. */
  text: "#E8ECF2",
  /** Reading paragraphs, and labels on a view. */
  "text-soft": "#C9D2E0",
  /** Labels, secondary lines, inactive items. */
  "text-quiet": "#9AA6B8",
  /** The one action colour: the filled button, the active marker, the speed readout, checked boxes. */
  sun: "#F2B84B",
  /** Text on `sun`. */
  "on-sun": "#141413",
  /** Links. */
  sky: "#8EC2FF",
  /** A link on hover. */
  "sky-hover": "#B9D9FF",
} as const;

export type ColourName = keyof typeof COLOURS;

/** The type: Plex Sans for words, Plex Sans JP behind it for Japanese, Plex Mono for every number, date, time and unit. The system faces are the fallback while a font loads. */
export const FONTS = {
  sans: `"IBM Plex Sans", "IBM Plex Sans JP", system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", "Segoe UI", sans-serif`,
  mono: `"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Noto Sans Mono CJK JP", monospace`,
} as const;

/** The radii, in px: controls, panels and cards, and the top corners of a phone sheet. */
export const RADII = { control: 8, panel: 12, sheet: 16 } as const;

/** The sizes, in px, the design names. */
export const SIZES = {
  /** The least a touch target is, each way. */
  touch: 44,
  /** An icon, and on a phone. */
  icon: 18,
  iconPhone: 20,
  /** Label type: capitals, 0.08em apart, `text-quiet`. */
  label: 11,
  control: 14,
  reading: 16,
  nameDesk: 56,
  namePhone: 40,
  nameCard: 26,
  nameCardPhone: 24,
  topBar: 64,
  topBarPhone: 56,
  controlBarPhone: 116,
  scaleSwitch: 148,
  panel: 320,
  page: 1120,
} as const;

/** Every token as `--kui-<name>: value`, the one list the CSS below and the parts' fallbacks are written from. */
export const TOKEN_PROPERTIES: Readonly<Record<string, string>> = Object.freeze({
  ...Object.fromEntries(Object.entries(COLOURS).map(([name, value]) => [`--kui-${name}`, value])),
  "--kui-font": FONTS.sans,
  "--kui-font-mono": FONTS.mono,
  "--kui-radius-control": `${RADII.control}px`,
  "--kui-radius-panel": `${RADII.panel}px`,
  "--kui-radius-sheet": `${RADII.sheet}px`,
});

/**
 * The tokens as one CSS rule, for a `<style>` in the page, a build or `installTokens`.
 * @param selector What gets the custom properties; `:root` by default.
 * @example
 * tokensCss(); // ":root { --kui-space: #070A10; … }"
 */
export function tokensCss(selector = ":root"): string {
  const lines = Object.entries(TOKEN_PROPERTIES).map(([name, value]) => `  ${name}: ${value};`);
  return `${selector} {\n${lines.join("\n")}\n}\n`;
}

/**
 * Puts the tokens on a document's `:root`, once, as an adopted stylesheet where the browser has one (no inline style, so a strict Content-Security-Policy allows it),
 * else as a `<style>` carrying `nonce`. Calling it again does nothing.
 * @example
 * installTokens(document);
 */
export function installTokens(doc: Document = document, nonce = ""): void {
  const marker = "data-kazoku-tokens";
  if (doc.documentElement.hasAttribute(marker)) return;
  doc.documentElement.setAttribute(marker, "");
  const css = tokensCss();
  const view = doc.defaultView;
  if (view !== null && typeof view.CSSStyleSheet === "function" && "replaceSync" in view.CSSStyleSheet.prototype && "adoptedStyleSheets" in doc) {
    try {
      const sheet = new view.CSSStyleSheet();
      sheet.replaceSync(css);
      doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
      return;
    } catch {
      /* a browser that has the API and refuses it: the <style> below */
    }
  }
  const style = doc.createElement("style");
  if (nonce !== "") style.setAttribute("nonce", nonce);
  style.textContent = css;
  doc.head.append(style);
}

/** The value of a token as the CSS reads it, with the design's own value as the fallback: `kui("panel")` is `var(--kui-panel, #121722)`. */
export const kui = (name: ColourName): string => `var(--kui-${name}, ${COLOURS[name]})`;

/** The relative luminance of a `#rrggbb` colour, as WCAG 2 reckons it. */
export function luminance(hex: string): number {
  const channel = (at: number): number => {
    const value = Number.parseInt(hex.slice(at, at + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/**
 * The contrast ratio of two `#rrggbb` colours, 1 to 21, as WCAG 2 reckons it.
 * @example
 * contrastRatio("#E8ECF2", "#121722"); // about 15.1
 */
export function contrastRatio(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

const TEXT_COLOURS = ["text", "text-soft", "text-quiet", "sun", "sky", "sky-hover"] as const;
const GROUNDS = ["space", "page", "panel", "line"] as const;

/** The pairs of text or icon colour and ground the design promises at 4.5:1 or better: `[foreground, ground]`. */
export const READABLE_PAIRS: readonly (readonly [ColourName, ColourName])[] = [
  ...TEXT_COLOURS.flatMap((foreground) => GROUNDS.map((ground) => [foreground, ground] as const)),
  ["on-sun", "sun"] as const,
];

/** The pairs that fail 4.5:1, from `READABLE_PAIRS`: none, while the design is kept. */
export function unreadablePairs(colours: Readonly<Record<string, string>> = COLOURS): string[] {
  return READABLE_PAIRS.filter(([foreground, ground]) => contrastRatio(colours[foreground] as string, colours[ground] as string) < 4.5).map(([foreground, ground]) => `${foreground} on ${ground}`);
}
