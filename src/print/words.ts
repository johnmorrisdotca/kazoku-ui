// The words a printed sheet carries, in English and Japanese. Every key is in both; a test holds that. The Japanese is plain, everyday words, mostly hiragana, for children.
export interface PrintWords {
  /** The label before the underline a child writes a name on. */
  name: string;
  region: string;
  flag: string;
  latitudeBand: string;
  season: string;
  level: string;
  language: string;
  version: string;
  date: string;
  address: string;
  /** "Page {n} of {total}" with the numbers filled in by `pageOf`. */
  page: string;
  glue: string;
  cut: string;
  tileOf: string;
  button: string;
  qr: string;
}

export type Language = "en" | "ja";

export const WORDS: Record<Language, PrintWords> = {
  en: {
    name: "Name:", region: "Region", flag: "Flag", latitudeBand: "Latitude band", season: "Season", level: "Level", language: "Language", version: "Version", date: "Date", address: "Address",
    page: "Page {n} of {total}", glue: "Glue strip", cut: "Cut along the corner marks. Glue each page over the glue strip of the page next to it.", tileOf: "Row {row}, column {column}", button: "Print / save PDF", qr: "QR code of the address",
  },
  ja: {
    name: "なまえ:", region: "ちいき", flag: "はた", latitudeBand: "いどの おび", season: "きせつ", level: "レベル", language: "ことば", version: "バージョン", date: "ひづけ", address: "アドレス",
    page: "{n} / {total} ページ", glue: "のりしろ", cut: "すみの しるしで きります。となりの ページの のりしろに かさねて はります。", tileOf: "{row} だん め、{column} れつ め", button: "いんさつ / PDFで ほぞん", qr: "アドレスの QRコード",
  },
};

/** The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

export const wordsFor = (language: Language, overrides: Partial<PrintWords> = {}): PrintWords => ({ ...WORDS[language], ...overrides });

/** "Page 2 of 6" (or "2 / 6 ページ"). */
export const pageOf = (words: PrintWords, n: number, total: number): string => words.page.replace("{n}", String(n)).replace("{total}", String(total));
