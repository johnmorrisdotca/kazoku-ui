// The text that puts an element in a page, for each way a page is made: a script tag from a CDN, an ES module, React, Vue, Angular, Svelte, or an iframe of the embed page.
// Pure: no DOM. A package gives the tag, the entry points and the attributes of its element once and gets all seven; the panel shows them as the reader changes a choice.

/**
 * The ways `embedSnippet` writes an element into a page, in the order the panel's tabs show them.
 *
 * @example
 * ```ts
 * import { EMBED_KINDS } from "@johnmorrisdotca/kazoku-ui/embed-panel";
 *
 * console.log(EMBED_KINDS.join(", "));
 * ```
 */
export const EMBED_KINDS = ["html", "module", "react", "vue", "angular", "svelte", "iframe"] as const;

/**
 * One of the ways in `EMBED_KINDS`.
 *
 * @example
 * ```ts
 * import { EMBED_KINDS, type EmbedKind } from "@johnmorrisdotca/kazoku-ui/embed-panel";
 *
 * const kind: EmbedKind = EMBED_KINDS[2];
 * console.log(kind);
 * ```
 */
export type EmbedKind = (typeof EMBED_KINDS)[number];

/**
 * What `embedSnippet` needs to know about an element: where it comes from, what it is called and what it is given.
 *
 * @example
 * ```ts
 * import { embedSnippet, type SnippetSpec } from "@johnmorrisdotca/kazoku-ui/embed-panel";
 *
 * const spec: SnippetSpec = {
 *   package: "@scope/dial",
 *   cdn: "https://cdn.jsdelivr.net/npm/@scope/dial@1.0.0",
 *   tag: "scope-dial",
 *   element: "element",
 *   entries: [],
 *   attrs: [["value", "7"]],
 *   name: "dial",
 *   iframe: { src: "https://example.com/embed.html?value=7", title: "Dial", width: 320, height: 320 },
 * };
 * console.log(embedSnippet("html", spec));
 * ```
 */
export interface SnippetSpec {
  /** The npm name, for the `import` lines: `@scope/name`. */
  package: string;
  /** The package on the CDN with its version: `https://cdn.jsdelivr.net/npm/@scope/name@1.2.3`. */
  cdn: string;
  /** The element's tag. */
  tag: string;
  /** The subpath (under the package name) that defines the tag; an empty text is the package's main entry. */
  element: string;
  /** More subpaths to load beside it (data, looks); none is fine. */
  entries: readonly string[];
  /** The attributes, in the order they are written. A value of `""` is written as a bare attribute. */
  attrs: readonly (readonly [string, string])[];
  /** The name the React, Angular and plain module examples use: `planet` gives `Planet`, `PlanetComponent`, `app-planet` and `#planet`. */
  name: string;
  /** The embed page as an iframe. */
  iframe: { src: string; title: string; width: number; height: number };
}

const quote = (value: string): string => `"${value.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`;
const joinPath = (...parts: readonly string[]): string => parts.filter((part) => part !== "").join("/");

/** The attributes as they are written in a tag: `body="mars" moons`. */
export function attrText(attrs: SnippetSpec["attrs"]): string {
  return attrs.map(([key, value]) => (value === "" ? key : `${key}=${quote(value)}`)).join(" ");
}

/**
 * The text that puts an element in a page, for one way of making the page: a script tag from the CDN, an ES module, a React component, a Vue single-file component, an Angular
 * standalone component, a Svelte component, or an iframe.
 *
 * @param kind - The way the page is made.
 * @param spec - The element and what it is given.
 * @returns The text to paste into the page's source.
 *
 * @example
 * ```ts
 * import { embedSnippet } from "@johnmorrisdotca/kazoku-ui/embed-panel";
 *
 * const spec = {
 *   package: "@scope/dial",
 *   cdn: "https://cdn.jsdelivr.net/npm/@scope/dial@1.0.0",
 *   tag: "scope-dial",
 *   element: "element",
 *   entries: [],
 *   attrs: [["value", "7"]] as const,
 *   name: "dial",
 *   iframe: { src: "https://example.com/embed.html", title: "Dial", width: 320, height: 320 },
 * };
 * console.log(embedSnippet("react", spec));
 * ```
 */
export function embedSnippet(kind: EmbedKind, spec: SnippetSpec): string {
  const Name = spec.name.charAt(0).toUpperCase() + spec.name.slice(1);
  const attrs = attrText(spec.attrs);
  const subpaths = [spec.element, ...spec.entries];
  if (kind === "iframe") {
    const f = spec.iframe;
    return `<iframe\n  src=${quote(f.src)}\n  title=${quote(f.title)}\n  width="${f.width}"\n  height="${f.height}"\n  loading="lazy"\n  style="border: 0"\n></iframe>`;
  }
  if (kind === "html") {
    const scripts = subpaths.map((path) => `<script type="module" src="${joinPath(spec.cdn, path)}/+esm"></script>`);
    return `${scripts.join("\n")}\n\n<${spec.tag} ${attrs}></${spec.tag}>`;
  }
  const imports = subpaths.map((path) => `import "${joinPath(spec.package, path)}";`);
  if (kind === "module") {
    const sets = spec.attrs.map(([key, value]) => `${spec.name}.setAttribute(${JSON.stringify(key)}, ${JSON.stringify(value)});`);
    return `${imports.join("\n")}\n\nconst ${spec.name} = document.createElement("${spec.tag}");\n${sets.join("\n")}\ndocument.querySelector("#${spec.name}").append(${spec.name});`;
  }
  const dynamic = subpaths.map((path) => `void import("${joinPath(spec.package, path)}");`);
  if (kind === "react") {
    return `import { useEffect } from "react";\n\nexport function ${Name}() {\n  useEffect(() => {\n    // The element needs a browser, so it is imported in an effect, never at the top of the file.\n${dynamic.map((l) => `    ${l}`).join("\n")}\n  }, []);\n  return <${spec.tag} ${attrs} />;\n}`;
  }
  if (kind === "vue") {
    return `<script setup lang="ts">\nimport { onMounted } from "vue";\n\nonMounted(() => {\n${dynamic.map((l) => `  ${l}`).join("\n")}\n});\n</script>\n\n<template>\n  <${spec.tag} ${attrs}></${spec.tag}>\n</template>`;
  }
  if (kind === "angular") {
    return `import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from "@angular/core";\n\n@Component({\n  selector: "app-${spec.name}",\n  standalone: true,\n  schemas: [CUSTOM_ELEMENTS_SCHEMA],\n  template: \`<${spec.tag} ${attrs}></${spec.tag}>\`,\n})\nexport class ${Name}Component implements OnInit {\n  ngOnInit(): void {\n    // The element needs a browser: ngOnInit also runs when a server renders.\n    if (typeof window !== "undefined") {\n${dynamic.map((l) => `      ${l}`).join("\n")}\n    }\n  }\n}`;
  }
  return `<script lang="ts">\n  import { onMount } from "svelte";\n\n  onMount(() => {\n${dynamic.map((l) => `    ${l}`).join("\n")}\n  });\n</script>\n\n<${spec.tag} ${attrs}></${spec.tag}>`;
}
