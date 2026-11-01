// The labels, in English and Japanese. Every key is in both; a test holds that. Add a language by giving `words` a complete set.

export interface ViewWords {
  group: string;
  angle: string;
  tilt: string;
  autoTurn: string;
  front: string;
  zoom: string;
  zoomOut: string;
  zoomTwo: string;
  zoomIn: string;
  fit: string;
  pan: string;
  panLeft: string;
  panRight: string;
  panUp: string;
  panDown: string;
  drag: string;
  dragMove: string;
  dragTurn: string;
}

export type Language = "en" | "ja";

export const WORDS: Record<Language, ViewWords> = {
  en: {
    group: "View controls",
    angle: "Angle",
    tilt: "Tilt",
    autoTurn: "Auto-turn",
    front: "Front",
    zoom: "Zoom",
    zoomOut: "Zoom out",
    zoomTwo: "Zoom to 2 times",
    zoomIn: "Zoom in",
    fit: "Fit",
    pan: "Move the view",
    panLeft: "Move left",
    panRight: "Move right",
    panUp: "Move up",
    panDown: "Move down",
    drag: "What a drag does",
    dragMove: "Move",
    dragTurn: "Turn",
  },
  ja: {
    group: "表示の操作",
    angle: "角度",
    tilt: "傾き",
    autoTurn: "自動回転",
    front: "正面",
    zoom: "ズーム",
    zoomOut: "縮小",
    zoomTwo: "2倍にする",
    zoomIn: "拡大",
    fit: "全体",
    pan: "表示を動かす",
    panLeft: "左へ",
    panRight: "右へ",
    panUp: "上へ",
    panDown: "下へ",
    drag: "ドラッグの動作",
    dragMove: "移動",
    dragTurn: "回転",
  },
};

/** The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

/** The words for a language, with any of your own over them. */
export const wordsFor = (language: Language, overrides: Partial<ViewWords> = {}): ViewWords => ({ ...WORDS[language], ...overrides });
