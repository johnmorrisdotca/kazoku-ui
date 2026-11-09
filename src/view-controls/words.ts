// The labels, in English and Japanese. Every key is in both; a test holds that. Add a language by giving `words` a complete set.

export interface ViewWords {
  group: string;
  angle: string;
  tilt: string;
  roll: string;
  /** The name of the button that tumbles on all three axes. */
  tumble: string;
  /** The name of the row that chooses which axis Auto-turn drives. */
  axis: string;
  autoTurn: string;
  front: string;
  zoom: string;
  zoomOut: string;
  /** Not shown any more: the bar has no "2×" button since the readout came, as it read like one. Kept so a page's own `words` still type-check. */
  zoomTwo: string;
  zoomIn: string;
  fit: string;
  centre: string;
  pan: string;
  panLeft: string;
  panRight: string;
  panUp: string;
  panDown: string;
  drag: string;
  dragMove: string;
  dragTurn: string;
  zoomLevel: string;
  zoomReset: string;
  more: string;
  speed: string;
  /** The name of the pair of buttons that choose which way Auto-turn goes. */
  direction: string;
  turnLeft: string;
  turnRight: string;
  slow: string;
  medium: string;
  fast: string;
  /** How the wheel, a pinch and Space move the view. Read out, not shown. */
  gestures: string;
}

export type Language = "en" | "ja";

export const WORDS: Record<Language, ViewWords> = {
  en: {
    group: "View controls",
    angle: "Angle",
    tilt: "Tilt",
    roll: "Roll",
    tumble: "All",
    axis: "Auto-turn axis",
    autoTurn: "Auto-turn",
    front: "Front",
    zoom: "Zoom",
    zoomOut: "Zoom out",
    zoomTwo: "Zoom to 2 times",
    zoomIn: "Zoom in",
    fit: "Fit",
    centre: "Centre",
    pan: "Move the view",
    panLeft: "Move left",
    panRight: "Move right",
    panUp: "Move up",
    panDown: "Move down",
    drag: "What a drag does",
    dragMove: "Move",
    dragTurn: "Turn",
    zoomLevel: "Zoom level",
    zoomReset: "back to Fit",
    more: "More",
    speed: "Speed",
    direction: "Turn direction",
    turnLeft: "Left",
    turnRight: "Right",
    slow: "Slow",
    medium: "Medium",
    fast: "Fast",
    gestures: "Turn: drag. Tilt: drag up or down. Roll: Shift and a drag, or a two-finger twist. Move: the wheel, Shift and the wheel, Ctrl or Command and a drag, Space and a drag, the middle or right button, or two fingers. Zoom: Ctrl, Command or Alt with the wheel, or a pinch. Keys: the arrows turn, + and - zoom. Front and Fit: double-click when zoomed in, Home or 0.",
  },
  ja: {
    group: "表示の操作",
    angle: "角度",
    tilt: "傾き",
    roll: "ロール",
    tumble: "すべて",
    axis: "自動回転の軸",
    autoTurn: "自動回転",
    front: "正面",
    zoom: "ズーム",
    zoomOut: "縮小",
    zoomTwo: "2倍にする",
    zoomIn: "拡大",
    fit: "全体",
    centre: "中央",
    pan: "表示を動かす",
    panLeft: "左へ",
    panRight: "右へ",
    panUp: "上へ",
    panDown: "下へ",
    drag: "ドラッグの動作",
    dragMove: "移動",
    dragTurn: "回転",
    zoomLevel: "ズーム倍率",
    zoomReset: "全体に戻す",
    more: "詳細",
    speed: "速さ",
    direction: "回る向き",
    turnLeft: "左へ",
    turnRight: "右へ",
    slow: "ゆっくり",
    medium: "ふつう",
    fast: "はやい",
    gestures: "回転：ドラッグ。傾き：上下のドラッグ。ロール：Shiftを押しながらのドラッグ、または2本指のひねり。移動：ホイール、Shiftとホイール、CtrlまたはCommandを押しながらのドラッグ、Spaceを押しながらのドラッグ、マウスの中ボタンか右ボタン、または2本指のドラッグ。ズーム：Ctrl、Command、またはAltを押しながらのホイール、あるいはピンチ。キー：矢印で回転、＋と－で拡大と縮小。正面と全体表示：拡大中にダブルクリック、Homeまたは0。",
  },
};

/** The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

/** The words for a language, with any of your own over them. */
export const wordsFor = (language: Language, overrides: Partial<ViewWords> = {}): ViewWords => ({ ...WORDS[language], ...overrides });
