# Changelog

## [0.6.0] - 2026-11-02

The fourth part: choices kept in the address, at `@johnmorrisdotca/kazoku-ui/address-state`. No element.

- `createAddressState({ defaults, delay, host })`: `get`, `has`, `all`, `set`, `setMany`, `remove`, `subscribe(listener, keys?)`, `flush`, `destroy`. It writes with `replaceState` (no history entry; the path, hash and other parameters kept; a value equal to its default leaves the address), as one write for the changes inside `delay` (250 ms by default; 0 writes at once). A subscriber hears each change made through any state on the page, with `{ key, value, previous, source }`, and the reader going back or forward (`source: "navigation"`). A page that cannot change its address still works.
- The smaller pieces: `readParams`, `readParam`, `applyParams(search, changes, defaults?)` and `createAddressWriter({ delay, host })` (`write(compute)`, `flush()`, `cancel()`). All of it imports on a server.
- The view controls now write their address through `createAddressWriter`, the theme switch and the language picker through `createAddressState`: the same addresses, the same quarter-second write for the view controls, nothing changes for a page.
- Docs: `docs/address-state.md`. The demo's `address.html` keeps a name, a size and dots in the address beside the theme switch and the language picker.

## [0.5.0] - 2026-11-02

The third part: the language picker, at `@johnmorrisdotca/kazoku-ui/language-picker` (and `/language-picker/element`, `/language-picker/define`).

- `<kazoku-language-picker languages="en ja">`: a button for each language the page lists, each in its own name (English, 日本語, Français; any other code is named by `Intl.DisplayNames` in its own language). It writes the choice as `lang` on a `target` (the page's `<html>` by default) and sends `kazoku-languagechange` with `{ lang, previous, reason, target }` (reasons `init`, `user`, `set`, `external`). Each button carries its own `lang`.
- It starts in the language of the address (`address`, `?lang=`, `address-key`), else the store (`storage`, in a try/catch), else `value`, else the reader's browser languages (`ja-JP` is `ja`), else what the target's `lang` says, else the first code. Another writer of the target's `lang` moves it with it.
- The pure entry (`parseLanguages`, `matchLanguage`, `languageName`, `startingLanguage`, `applyLanguage`, the words) imports on a server. Docs: `docs/language-picker.md`.
- Under a strict `style-src`, like the others. The demo's English and 日本語 buttons are now a picker, and the view controls and theme switch answer to it.
- The theme switch and the view controls are unchanged (the theme switch shares its target and store code with the picker; same behaviour).

## [0.4.0] - 2026-11-01

The second part: the theme switch, at `@johnmorrisdotca/kazoku-ui/theme-switch` (and `/theme-switch/element`, `/theme-switch/define`).

- `<kazoku-theme-switch>`: Light, Dark and Auto as 48 px buttons. It writes the choice as `data-theme` on a `target` (the page's `<html>` by default; Auto removes the attribute so the device decides), and sends `kazoku-themechange` with `{ choice, scheme, reason, target }` (reasons `init`, `user`, `set`, `system`, `external`).
- It remembers the choice in the address (`address`, `address-key`) and in `localStorage` (`storage`, in a try/catch: a browser that keeps nothing still switches). Read in the order address, store, `value`, the target's own `data-theme`.
- Another writer of the target's `data-theme` moves the switch with it, and a change of the device's colours is an event while on Auto. `modes="light dark"` leaves Auto out. `target` is found in the switch's own tree first, so it works inside a shadow root.
- The element is light or dark with the page's `data-theme`, not only the device's, so it is dark in a page forced dark on a light device. Labels in English and Japanese. Under a strict `style-src`, like the view controls.
- The pure entry (`readTheme`, `applyTheme`, `resolveTheme`, `themeOf`, `parseModes`, `parseTheme`, the words) imports on a server. Docs: `docs/theme-switch.md`. The demo has a switch in its header and tells the view controls.
- The view controls are unchanged.

## [0.3.1] - 2026-11-01

- The styles now pass a strict Content-Security-Policy. `<kazoku-view-controls>` adopts its styles as a constructable stylesheet (`adoptedStyleSheets`), which `style-src 'self'` allows with no `'unsafe-inline'` and no hash; before, it wrote a `<style>` into its shadow root and a strict `style-src` blocked it. Elements with the same styles share one sheet.
- A browser without constructable stylesheets gets the `<style>` as before, now carrying the element's `nonce` (`<kazoku-view-controls nonce="...">` or `element.nonce`), so a page with `style-src 'nonce-...'` allows it.
- What a page needs is in `docs/csp.md`. The demo has `csp.html` (`style-src 'self'`) and `csp-nonce.html`, both with `?fallback` to force the `<style>` route, and `e2e/csp.demo.mjs` plays them in Chromium and WebKit.
- Defaults and the look are unchanged.

## [0.3.0] - 2026-11-01

- Zoom about a point of your own: the `anchor` attribute (`x,y`), the `element.anchor` setter and the controller's `anchor` member and option take a point in CSS pixels from the view's middle at Fit. The + and - buttons, the 2x button and the + and - keys zoom about it, and it stays fixed on screen within a pixel; wheel, pinch and double tap still zoom about the pointer. With no anchor they zoom about the middle, as before. `zoomAt` and `zoomBy` with no point use it.
- Arrow Up the way a wheel goes: `key-tilt="wheel"` (option `keyTilt: "wheel"`) makes Arrow Up tip the way a wheel turned up does. The default, `drag`, still tips like a drag up.
- `stop-turn` (option `stopTurn`) stops the automatic turn on a press, the wheel or a key on the view, with a `pause` event. Off by default; buttons and sliders never stop it.
- `tilt-step` (option `tiltStep`) rounds the tilt of a drag to a multiple of this many degrees; `1` gives whole degrees. `dragTurn` takes it as a seventh argument. 0 by default.
- The demo switches them on in its address: `?anchor=pin`, `?key-tilt=wheel`, `?stop-turn`, `?tilt-step=1`.

## [0.2.1] - 2026-11-01

- `ignore` now sees through shadow DOM: it tests the elements on the event's `composedPath()`, from the innermost up to the view, so a button inside a web component's open shadow root is left alone. Before, only the event's target (the host) was tested. A closed shadow root stays a limit: mark its host with `data-kazoku-ignore`.

## [0.2.0] - 2026-11-01

- A button, link or form control inside the view still works: a pointer press on a child that matches the new `ignore` selector is not captured, so the click goes through and a drag from the empty view still turns it. Attribute `ignore` and `createViewController` option `ignore`; the default is `button, a, input, select, textarea, label, [data-kazoku-ignore]` (`DEFAULT_IGNORE`); `ignore=""` leaves nothing alone.
- Open at a zoom set against the page's fit scale: `zoom` is `fit` (the default, unchanged) or a number where 1 is the scene's natural size, and `fit-scale` / `setFitScale(n)` / the `fitScale` option tell the controls what zoom 1 means. The event's `zoom` stays 1 at Fit. New controller members `fitScale`, `startZoom`, `setStartZoom`; a new `fit-scale` reason in the event. `formatAddress` takes a fifth argument, `startZoom`, so the opening zoom keeps the address plain.

## [0.1.0] - 2026-11-01

The first release, and its first part: view controls, at `@johnmorrisdotca/kazoku-ui/view-controls`.

- `<kazoku-view-controls>`, a framework-free custom element (`/view-controls/element`, registered by `/view-controls/define`, which leaves a tag already taken alone), and `createViewController`, the same hands without an element.
- Angle and tilt sliders, Auto-turn with play and pause, Front; zoom out, 2 times, in and Fit; zoom about the pointer and with Ctrl or Command and the wheel; the four-arrow pan pad and the Move or Turn choice for a drag.
- Touch: one finger turns at 1x and moves the view when zoomed in; two fingers pinch.
- Choices kept in the address, with keys you can rename (`parseAddress`, `formatAddress`).
- It never draws: it reports `{ yaw, tilt, zoom, panX, panY, turning, drag }` in a `kazoku-viewchange` event or an `onChange` callback.
- Labels in English and Japanese; light and dark; 48 px touch targets; a compact bar on a phone; no automatic turn for a reader who prefers reduced motion.
- No runtime dependencies.
