// The keys that focus the box: the chords a `shortcut` attribute names, whether a key press is one, and whether the press came from a field that is being typed in. Moved out of element.ts as it was.

export const editable = (target: EventTarget | undefined): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable || /^(textbox|combobox|searchbox)$/.test(target.getAttribute("role") ?? "");
};

export interface Chord {
  key: string;
  ctrl: boolean;
  meta: boolean;
  mod: boolean;
  alt: boolean;
}

/** The chords a `shortcut` attribute names: `/`, `mod+k`, `ctrl+k`, `meta+k`, `alt+s`, several separated by spaces. `mod` is Control or Command. */
export function chordsOf(text: string | null): Chord[] {
  return (text ?? "")
    .split(/\s+/)
    .filter((token) => token !== "")
    .map((token) => {
      const parts = token === "+" ? ["+"] : token.toLowerCase().split("+");
      const key = parts[parts.length - 1] ?? "";
      const mods = parts.slice(0, -1);
      return { key, ctrl: mods.includes("ctrl"), meta: mods.includes("meta"), mod: mods.includes("mod"), alt: mods.includes("alt") };
    })
    .filter((chord) => chord.key !== "");
}

export function chordMatches(chord: Chord, event: KeyboardEvent): boolean {
  if (event.key.toLowerCase() !== chord.key) return false;
  if (chord.mod) return (event.ctrlKey || event.metaKey) && !event.altKey;
  return event.ctrlKey === chord.ctrl && event.metaKey === chord.meta && event.altKey === chord.alt;
}
