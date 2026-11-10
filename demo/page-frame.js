// The page frame, shown: the header line in this page's top bar, the credit line in its three forms, and the title the header's `meta` attribute keeps in the reader's language.
import "./dist/language-picker/define.js";
import "./dist/theme-switch/define.js";

const SAY = {
  en: {
    title: "page header and credits", back: "The view controls",
    intro: "A visitor can land on any page of a demo, from a search, a shared link or a README. Every page therefore says what it is, gives a way home and to the printable sheets, and credits its data, in the top bar and above the footer, with nothing to open.",
    headerHead: "The header line",
    headerText: "The package's name and what this page shows, with Home and, when the package has sheets, a link to them. Home is marked as the current page on the home page. It sits in the page's own top bar, a row of its own, not a second bar.",
    creditsHead: "The credit line, three ways", lineHead: "This page's own credits", bothHead: "A line and the link to the full credits", embedHead: "The embed form: the credit only, small",
    headHead: "The title and the description",
    headText: "The page's title and description are made from the same words as the header line, so they cannot disagree. A build writes them into the HTML with pageHeadHtml; the header's meta attribute changes them when the reader changes language.",
    titleIs: "This page's title now: ",
  },
  ja: {
    title: "ページの見出しとクレジット", back: "表示の操作",
    intro: "デモのどのページにも、検索や共有されたリンク、READMEから直接たどり着くことがあります。そこで、どのページも、上部のバーとフッターの上に、このページが何かを示す行、ホームと印刷用シートへのリンク、データの出典を出します。メニューを開く必要はありません。",
    headerHead: "見出しの行",
    headerText: "パッケージの名前とこのページの内容、そしてホームへのリンクです。パッケージに印刷用シートがあれば、そのリンクも出ます。ホームページでは、ホームが現在のページとして示されます。見出しはページ上部のバーの中の一行で、もう一つのバーではありません。",
    creditsHead: "クレジットの行、三つの形", lineHead: "このページ自身のクレジット", bothHead: "クレジットの行と、全文へのリンク", embedHead: "埋め込み用：クレジットだけを小さく",
    headHead: "タイトルと説明",
    headText: "ページのタイトルと説明は、見出しの行と同じ言葉から作られるので、食い違いません。ビルドがpageHeadHtmlでHTMLに書き込み、読み手が言語を変えたときは、見出しのmeta属性が書き換えます。",
    titleIs: "このページの今のタイトル：",
  },
};
const say = (key) => SAY[document.documentElement.lang === "ja" ? "ja" : "en"][key];
function words() {
  for (const el of document.querySelectorAll("[data-say]")) el.textContent = say(el.dataset.say);
  // The header's `meta` attribute has already set the title for this language; read it back.
  document.getElementById("meta").textContent = `${say("titleIs")}${document.title}`;
}
new globalThis.MutationObserver(() => globalThis.queueMicrotask(words)).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
words();
