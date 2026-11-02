// The language choice without the element: the list of codes a page gives, each language's own name, which one to start in, and how one is applied.

/** The codes when a page gives none. */
export const DEFAULT_LANGUAGES: readonly string[] = ["en", "ja"];
/** The attribute the choice is written to on the target. */
export const LANGUAGE_ATTRIBUTE = "lang";
/** The address parameter, with `address`. */
export const LANGUAGE_ADDRESS_KEY = "lang";
/** The localStorage key, with a bare `storage`. */
export const LANGUAGE_STORAGE_KEY = "kazoku-lang";

/** Each language's own name, for the codes the family uses. Any other code gets its name from `Intl.DisplayNames`, else the code itself. */
export const OWN_NAMES: Readonly<Record<string, string>> = {
  en: "English",
  ja: "日本語",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  pt: "Português",
  it: "Italiano",
  nl: "Nederlands",
  sv: "Svenska",
  pl: "Polski",
  ru: "Русский",
  ko: "한국어",
  zh: "中文",
  "zh-hans": "简体中文",
  "zh-hant": "繁體中文",
};

const CODE = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/;

/** A code as the page may write it ("EN", "ja_JP", " fr ") in the form this part compares: lower case, dashes. `undefined` if it is not a language code. */
export function normaliseCode(value: string | null | undefined): string | undefined {
  const code = (value ?? "").trim().toLowerCase().replace(/_/g, "-");
  return CODE.test(code) ? code : undefined;
}

/** The codes of `languages="en ja fr"`: valid ones, once each, in the order given. Nothing usable gives `en` and `ja`. */
export function parseLanguages(value: string | null | undefined): string[] {
  const codes: string[] = [];
  for (const word of (value ?? "").split(/[\s,]+/)) {
    const code = normaliseCode(word);
    if (code !== undefined && !codes.includes(code)) codes.push(code);
  }
  return codes.length > 0 ? codes : [...DEFAULT_LANGUAGES];
}

/** The entry of `list` that a language tag means: the tag itself, else its main language ("ja-JP" is "ja"). `undefined` if the list has neither. */
export function matchLanguage(tag: string | null | undefined, list: readonly string[]): string | undefined {
  const code = normaliseCode(tag);
  if (code === undefined) return undefined;
  if (list.includes(code)) return code;
  const main = code.split("-")[0] as string;
  return list.find((entry) => entry === main) ?? list.find((entry) => entry.split("-")[0] === main);
}

/** A language's own name: yours (`names`), the family's table, `Intl.DisplayNames` in that language, else the code. */
export function languageName(code: string, names: Readonly<Record<string, string>> = {}): string {
  const own = names[code] ?? OWN_NAMES[code];
  if (own !== undefined) return own;
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code);
    if (name !== undefined && name !== code) return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
  } catch {
    /* a browser that does not know the code */
  }
  return code;
}

/** What may say which language to start in, strongest first. Each is a language tag or `undefined`. */
export interface StartingLanguage {
  list: readonly string[];
  /** The address' search string such as `?lang=ja`, read with `addressKey`. */
  search?: string;
  addressKey?: string;
  /** A localStorage-like object and the key in it. A store that throws is the same as an empty one. */
  storage?: Pick<Storage, "getItem">;
  storageKey?: string;
  /** The page's own start (the `value` attribute). */
  value?: string | null;
  /** The reader's languages, most wanted first (`navigator.languages`). */
  preferred?: readonly string[];
  /** What the target holds now. */
  current?: string | null;
}

/** The language to start in: the address, the store, `value`, the reader's languages, what the page holds now, then the first of the list. */
export function startingLanguage(from: StartingLanguage): string {
  const { list } = from;
  if (from.search !== undefined) {
    const asked = matchLanguage(new URLSearchParams(from.search).get(from.addressKey ?? LANGUAGE_ADDRESS_KEY), list);
    if (asked !== undefined) return asked;
  }
  if (from.storage !== undefined) {
    try {
      const kept = matchLanguage(from.storage.getItem(from.storageKey ?? LANGUAGE_STORAGE_KEY), list);
      if (kept !== undefined) return kept;
    } catch {
      /* a browser that keeps nothing */
    }
  }
  const own = matchLanguage(from.value, list);
  if (own !== undefined) return own;
  for (const tag of from.preferred ?? []) {
    const wanted = matchLanguage(tag, list);
    if (wanted !== undefined) return wanted;
  }
  return matchLanguage(from.current, list) ?? (list[0] as string);
}

/** Writes the choice as `lang` on the target. */
export function applyLanguage(target: Element, code: string): void {
  target.setAttribute(LANGUAGE_ATTRIBUTE, code);
}
