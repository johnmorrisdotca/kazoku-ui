// The words the interface parts say themselves, in English and Japanese. Every key is in both; a test holds that. A page's own words (an object's name, a layer's label) come from the page.
import { languageOf, type Language } from "../shared/language.ts";

export interface InterfaceWords {
  // The icon buttons' names (their aria-label when the page gives none).
  slower: string; play: string; pause: string; faster: string; now: string; place: string; layers: string; look: string; flight: string; close: string; search: string; menu: string;
  // The control bar.
  lookLine: string; lookRealistic: string; lookPainted: string; controlBar: string; clockButton: string; pickerTitle: string; pickerField: string; pickerSet: string; pickerCancel: string; paused: string; realTime: string; backwards: string;
  // The scale switch.
  scale: string; surface: string; moons: string; solar: string; stars: string; galaxy: string;
  // The object card.
  card: string; everyNumber: string; everyNumberLink: string; everyNumberTail: string; source: string; noValue: string; computed: string;
  // The layers panel.
  layersTitle: string; dataSources: string; nonCommercial: string; shareAlike: string;
  // The segmented switch.
  languageGroup: string; cultureGroup: string; western: string; japanese: string; chinese: string;
  // The top bar.
  topBar: string; trail: string; searchField: string; home: string;
  // The reading page.
  rightNow: string; theNumbers: string; measure: string; value: string; comparison: string; related: string; sourceWord: string; tapNote: string;
}

export const WORDS: Record<Language, InterfaceWords> = {
  en: {
    slower: "Slower", play: "Play", pause: "Pause", faster: "Faster", now: "Back to now", place: "Your place", layers: "Layers", look: "Look", flight: "Free flight", close: "Close", search: "Search", menu: "Menu",
    lookLine: "Line", lookRealistic: "Realistic", lookPainted: "Painted",
    controlBar: "Time and view controls", clockButton: "Change the date and time", pickerTitle: "Set the date and time", pickerField: "Date and time", pickerSet: "Set", pickerCancel: "Cancel", paused: "Paused", realTime: "Real time", backwards: "backwards",
    scale: "Scale", surface: "Surface", moons: "Moons", solar: "Solar system", stars: "Stars", galaxy: "Galaxy",
    card: "About this object", everyNumber: "Every number links to its ", everyNumberLink: "source", everyNumberTail: ".", source: "Source", noValue: "No value", computed: "Computed for the time shown",
    layersTitle: "Layers", dataSources: "Data sources", nonCommercial: "non-commercial", shareAlike: "share-alike",
    languageGroup: "Language", cultureGroup: "Sky culture", western: "Western", japanese: "Japanese", chinese: "Chinese",
    topBar: "Site", trail: "You are here", searchField: "Search", home: "Home",
    rightNow: "Right now", theNumbers: "The numbers", measure: "Measure", value: "Value", comparison: "Compared, and source", related: "Related", sourceWord: "source", tapNote: "Tap a number for its source.",
  },
  ja: {
    slower: "ゆっくり", play: "再生", pause: "一時停止", faster: "速く", now: "現在に戻す", place: "現在地", layers: "レイヤー", look: "見た目", flight: "自由飛行", close: "閉じる", search: "検索", menu: "メニュー",
    lookLine: "線画", lookRealistic: "写実", lookPainted: "絵画風",
    controlBar: "時刻と表示の操作", clockButton: "日付と時刻を変える", pickerTitle: "日付と時刻を設定", pickerField: "日付と時刻", pickerSet: "設定", pickerCancel: "キャンセル", paused: "停止中", realTime: "実時間", backwards: "逆向き",
    scale: "スケール", surface: "地表", moons: "衛星", solar: "太陽系", stars: "恒星", galaxy: "銀河",
    card: "この天体について", everyNumber: "すべての数値は", everyNumberLink: "出典", everyNumberTail: "にリンクしています。", source: "出典", noValue: "値なし", computed: "表示中の時刻で計算",
    layersTitle: "レイヤー", dataSources: "データの出典", nonCommercial: "非営利のみ", shareAlike: "同一条件で共有",
    languageGroup: "言語", cultureGroup: "星座の文化", western: "西洋", japanese: "日本", chinese: "中国",
    topBar: "サイト", trail: "現在の場所", searchField: "検索", home: "ホーム",
    rightNow: "いま", theNumbers: "数値", measure: "項目", value: "値", comparison: "比較と出典", related: "関連", sourceWord: "出典", tapNote: "数値をタップすると出典が開きます。",
  },
};

export { languageOf, type Language };

/** The words in a language, with a page's own over them: `wordsFor("en", { layers: "Show" })`. */
export const wordsFor = (language: Language, overrides: Partial<InterfaceWords> = {}): InterfaceWords => ({ ...WORDS[language], ...overrides });
