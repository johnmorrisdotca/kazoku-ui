---
title: A settings menu
section: how-to
order: 28
description: One button that opens a panel of the page's own controls, and a sheet from the bottom on a phone.
---

`<kazoku-menu>` is one 48 px button. The page puts its own controls inside it, a language picker, a theme switch, a help switch or a link, and the button opens them in a panel. Those controls keep their own address and their own store. `MenuElement` is the class and `defineMenu` registers the tag. Escape, the Close button, or a press outside closes the panel and returns focus to the button. On a phone the panel is a sheet from the bottom.

## Use it

```html
<kazoku-menu>
  <p>Language, theme and help</p>
</kazoku-menu>
<kazoku-menu which="resources">
  <a href="https://github.com/johnmorrisdotca/kazoku-ui">GitHub</a>
</kazoku-menu>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/menu/define";
</script>
```

`which="resources"` names the second menu. With no `which`, the button says Settings. `kazoku-menutoggle` fires when the panel opens or closes, and `detail` is `{ open, which }`.

```ts
import { parseWhich } from "@johnmorrisdotca/kazoku-ui/menu";

parseWhich("resources");
```

## Attributes

| Attribute | |
|---|---|
| `which` | `settings` (the default) or `resources`. |
| `lang` | `en` or `ja`. Otherwise the page's language, else English. |
| `open` | The panel starts open. Taking the attribute off closes it. |
