// The labels, in English and Japanese. Every key is in both; a test holds that.
export interface PanelWords {
  /** The panel's heading, when it shows one (`heading` attribute). */
  title: string;
  /** The name of the group of size buttons. */
  size: string;
  /** The name of the row of tabs. */
  kinds: string;
  /** The name of the picker. */
  pick: string;
  search: string;
  all: string;
  /** Said under the picker when the search finds nothing. */
  none: string;
  /** The name of the picture beside the code. */
  preview: string;
  /** The name of the code box. */
  code: string;
  copy: string;
  copied: string;
  copyFail: string;
  open: string;
  docs: string;
  credits: string;
  /** Tab names (`kind_<id>`). */
  kind_html: string;
  kind_module: string;
  kind_react: string;
  kind_vue: string;
  kind_angular: string;
  kind_svelte: string;
  kind_iframe: string;
  kind_image: string;
  kind_element: string;
  kind_url: string;
  kind_svg: string;
}

export type Language = "en" | "ja";

export const WORDS: Record<Language, PanelWords> = {
  en: {
    title: "Put it in your page",
    size: "Size",
    kinds: "How your page is made",
    pick: "What to put in",
    search: "Search",
    all: "All",
    none: "Nothing matches",
    preview: "Preview",
    code: "Code",
    copy: "Copy code",
    copied: "Copied",
    copyFail: "Select the code and copy it by hand.",
    open: "Open the embed page",
    docs: "Read the docs",
    credits: "Credit",
    kind_html: "HTML",
    kind_module: "ES module",
    kind_react: "React",
    kind_vue: "Vue",
    kind_angular: "Angular",
    kind_svelte: "Svelte",
    kind_iframe: "iframe",
    kind_image: "Image",
    kind_element: "Custom element",
    kind_url: "iframe URL",
    kind_svg: "SVG",
  },
  ja: {
    title: "自分のページに入れる",
    size: "大きさ",
    kinds: "ページの作り方",
    pick: "入れるもの",
    search: "さがす",
    all: "すべて",
    none: "見つかりません",
    preview: "プレビュー",
    code: "コード",
    copy: "コードをコピー",
    copied: "コピーしました",
    copyFail: "コードを選んで、手でコピーしてください。",
    open: "埋め込みページを開く",
    docs: "ドキュメントを読む",
    credits: "クレジット",
    kind_html: "HTML",
    kind_module: "ESモジュール",
    kind_react: "React",
    kind_vue: "Vue",
    kind_angular: "Angular",
    kind_svelte: "Svelte",
    kind_iframe: "iframe",
    kind_image: "画像",
    kind_element: "カスタム要素",
    kind_url: "iframe URL",
    kind_svg: "SVG",
  },
};

/** The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

export const wordsFor = (language: Language, overrides: Partial<PanelWords> = {}): PanelWords => ({ ...WORDS[language], ...overrides });

/** What a tab says: the family's word for the id, else the page's own `labels`, else the id itself. */
export function kindLabel(id: string, language: Language, labels: Readonly<Record<string, string>> = {}, overrides: Partial<PanelWords> = {}): string {
  const mine = labels[id];
  if (mine !== undefined && mine !== "") return mine;
  const words = wordsFor(language, overrides) as unknown as Record<string, string>;
  return words[`kind_${id}`] ?? id;
}
