// The interface parts without the elements: the tokens, the words, the icons, and the pure rules each part keeps (the scale steps, the control bar's order and its clock words, the object card's data and checks,
// the layers panel's sources, the segmented switch's choices, the top bar's trail, the reading page's data). Nothing here touches the DOM, so it imports on a server and in a build script.
export const TAGS = {
  iconButton: "kazoku-icon-button",
  controlBar: "kazoku-control-bar",
  scaleSwitch: "kazoku-scale-switch",
  objectCard: "kazoku-object-card",
  layersPanel: "kazoku-layers-panel",
  segmentedSwitch: "kazoku-segmented-switch",
  button: "kazoku-button",
  topBar: "kazoku-top-bar",
  readingPage: "kazoku-reading-page",
} as const;
export const TAG = TAGS.controlBar;
export { COLOURS, contrastRatio, FONTS, installTokens, kui, luminance, RADII, READABLE_PAIRS, SIZES, TOKEN_PROPERTIES, tokensCss, unreadablePairs, type ColourName } from "./tokens.ts";
export { ICON_NAMES, ICON_STROKE, ICONS, iconSvg, isIconName, type IconName } from "./icons.ts";
export { languageOf, WORDS, wordsFor, type InterfaceWords, type Language } from "./words.ts";
export { canStep, formatMoment, fromInputValue, zoneName, SPEED_LADDER, speedWords, stepSpeed, toInputValue, type BarClock, type BarClockChange } from "./clock.ts";
export { CONTROL_ORDER, LOOKS, lookName, nextLook, parseControls, parseLooks, TIME_CONTROLS, VIEW_CONTROLS, type ControlName, type Look } from "./controls.ts";
export { isScaleStep, parseScaleSteps, SCALE_STEPS, scaleName, type ScaleStep } from "./scale.ts";
export { cultureSegments, LANGUAGE_SEGMENTS, parseSegments, type Segment } from "./segments.ts";
export { cardProblems, formatValue, hasValue, say, type Bilingual, type CardAction, type CardStat, type ObjectCardData, type SourceLink } from "./card.ts";
export { licenceText, sourcesFromCredits, type DoorCredit, type DoorSourceInfo, type LayerItem, type LayerSource } from "./layers.ts";
export { trailText, type SectionLink, type TrailItem } from "./trail.ts";
export { readingProblems, type ReadingGroup, type ReadingPageData, type ReadingRelated, type ReadingRow, type ReadingTile } from "./reading.ts";
