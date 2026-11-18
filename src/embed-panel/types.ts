// What the embed panel's page-facing functions are told and what its event carries, and the credit line's shape. Moved out of element.ts as it was; element.ts re-exports them.
import type { CreditPart } from "../shared/credit-parts.ts";

/** What the page's `generate`, `preview`, `credits` and `note` functions are told. */
export interface EmbedContext {
  /** The tab: `html`, `module`, `react`, `vue`, `angular`, `svelte`, `iframe`, or one the page added. */
  kind: string;
  /** The size chosen, in pixels across. */
  size: number;
  /** True when the text is for the picture beside the code, not for the reader to copy: a page may use a relative address there so the picture works from where the page is. */
  preview: boolean;
}

/** What the `kazoku-embedchange` event carries in `detail`. */
export interface EmbedChangeDetail {
  kind: string;
  size: number;
  /** The picker's choice (an item's `id`), or an empty text where there is no built-in picker. */
  value: string;
  /** The text to copy now. */
  code: string;
  /** `init` (once, when it comes up), `kind` (a tab), `size` (a size button), `pick` (the picker) or `set` (a property or attribute). */
  reason: "init" | "kind" | "size" | "pick" | "set";
}

export type Text = string | ((context: EmbedContext) => string);


/**
 * The credit line: a text, its pieces (some of them links), or a function of the choices that gives either; a function
 * that gives anything else gives no credit.
 *
 * @example
 * ```ts
 * import type { Credits } from "@johnmorrisdotca/kazoku-ui/embed-panel/element";
 *
 * const credits: Credits = ({ kind }) => [`${kind}: `, { text: "MIT", href: "https://opensource.org/license/mit" }];
 * ```
 */
export type Credits = string | readonly CreditPart[] | ((context: EmbedContext) => string | readonly CreditPart[]);

export type { CreditPart };
