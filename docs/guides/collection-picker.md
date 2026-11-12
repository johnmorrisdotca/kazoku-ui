---
title: Collection picker
section: how-to
order: 28
description: Search a list the page passes in, and keep a chosen list the reader can add to, remove from and reorder. Labels in English and Japanese.
---

Search a list the page passes in, and keep a chosen list. The page decides what the items are. The picker searches them and reports the chosen ids, in order.

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/collection-picker/define";
  const picker = document.querySelector("kazoku-collection-picker");
  picker.items = [
    { kind: "body", id: "mars", name: "Mars", group: "Planets", keywords: ["red"] },
    { kind: "body", id: "vega", name: "Vega", group: "Stars" },
  ];
  picker.addEventListener("kazoku-collectionchange", (event) => console.log(event.detail.ids));
</script>

<kazoku-collection-picker lang="en"></kazoku-collection-picker>
```

Each item is `{ kind, id, name, group, keywords }`. `name` is what the reader sees, already in their language. `group` and `keywords` are extra words the search finds. `value` is the chosen ids, in order. Setting `items` or `value` from the page does not add a duplicate, and setting `value` reports `reason: "set"`. A press or the Enter key reports `reason: "user"`.

The search is one pass over a line prepared when `items` is set, so a list of about 17,000 items stays in the browser's time. An empty box lists nothing. A query shows at most 8 suggestions (`limit` changes that). Every word of the query must match, and case and accents are ignored.

The chosen rows have Move up, Move down and Remove. Move up on the first row and Move down on the last do nothing.

`lang="ja"` uses the Japanese labels. Left out, the page's language is used, and anything other than Japanese is English.

`CollectionPickerElement` is the class. `defineCollectionPicker` registers the tag, and does nothing if the tag is already taken.

```ts
import { addId, indexItems, moveId, removeId, searchItems, SUGGEST_LIMIT } from "@johnmorrisdotca/kazoku-ui/collection-picker";

const found = searchItems(indexItems([{ kind: "body", id: "mars", name: "Mars" }]), "mar");
console.log(found[0].id, SUGGEST_LIMIT, addId([], "mars"), moveId(["a", "mars"], "mars", -1), removeId(["mars"], "mars"));
```
