---
title: コレクションピッカー
section: how-to
order: 28
description: ページが渡した一覧を検索し、選んだものを加え、外し、並べ替えられます。ラベルは英語と日本語です。
---

[English](../collection-picker.md)

ページが渡した一覧を検索し、選んだものを保ちます。項目が何であるかはページが決めます。ピッカーは検索し、選ばれたidを順番どおり知らせます。

各項目は `{ kind, id, name, group, keywords }` です。`name`は、読む人の言語ですでに書かれた名前です。`group`と`keywords`は、検索が名前のほかに探す語です。`value`は、選ばれたidを順番どおりに並べたものです。ページから`items`や`value`を設定しても、同じidは重なりません。`value`を設定したときは`reason`が`"set"`です。ボタンかEnterキーのときは`"user"`です。

検索は、`items`を渡したときに作った1行を、先頭から一度だけ見ます。だから、約17,000件でもブラウザの時間におさまります。空の欄は何も出しません。入力すると候補は最大8件です（`limit`で変えられます）。入力した語はすべて一致する必要があり、大文字と小文字、アクセントは区別しません。

選んだ行には、上へ、下へ、外すがあります。最初の行の上へと、最後の行の下へは、何もしません。

`lang="ja"`で日本語のラベルになります。なければページの言語を使い、日本語以外は英語です。クラスは`CollectionPickerElement`です。`defineCollectionPicker`がタグを登録し、すでに登録されていれば何もしません。

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

```ts
import { addId, indexItems, moveId, removeId, searchItems, SUGGEST_LIMIT } from "@johnmorrisdotca/kazoku-ui/collection-picker";

const found = searchItems(indexItems([{ kind: "body", id: "mars", name: "Mars" }]), "mar");
console.log(found[0].id, SUGGEST_LIMIT, addId([], "mars"), moveId(["a", "mars"], "mars", -1), removeId(["mars"], "mars"));
```
