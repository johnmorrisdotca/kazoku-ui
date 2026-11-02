# Address state

Choices kept in the page's address: read, write and watch URL parameters, with `replaceState`, so a reload, a copied link or a second tab comes back to the same choices and a choice adds nothing to the history.
It is element-free: no markup, no DOM at import, so it imports on a server. The theme switch, the language picker and the view controls keep their choices through it.

```js
import { createAddressState } from "@johnmorrisdotca/kazoku-ui/address-state";

const state = createAddressState({ defaults: { size: "m" } });

state.get("size");         // "l" from ?size=l, else the default "m"
state.set("size", "l");    // ?size=l; setting "m" (the default) takes it off again
state.set("name", null);   // takes ?name off
state.subscribe(({ key, value, previous, source }) => redraw(key, value));
```

## `createAddressState(options?)`

Options: `defaults` (a key's start: a value equal to it leaves the address, and `get` gives it when the address has none), `delay` (milliseconds a write waits, 250 by default, 0 writes at once), `host` (a stand-in for `window`, for a test).

| Method | |
|---|---|
| `get(key)` | The value as the page will have it: a change still waiting counts, else the address, else the default, else `null`. |
| `has(key)` | Whether the address (or a change waiting) holds the key. |
| `all()` | Every parameter as `get` sees them. |
| `set(key, value)`, `setMany({ ... })`, `remove(key)` | A string or number sets; `null`, `undefined` or the default takes off. Subscribers hear it at once; the address is written after the delay. `setMany` is one write. |
| `subscribe(listener, keys?)` | Hears every change made through a state on this page (each one's, not only this one's) and the reader going back or forward. `keys` limits it. Returns the function that stops it. |
| `flush()`, `destroy()` | Write what waits now; `destroy` also stops listening. |

A change is `{ key, value, previous, source }`: `value` and `previous` are what the address holds (`null` when the key is not there), and `source` is `set` or `navigation` (back or forward to another address).
A change that sets what the address already holds is not announced.

## Writes

The address is written in place with `replaceState`, the path and the `#hash` kept and every other parameter left in its order. Changes inside the delay are one write, so a slider or a text box
does not reach the hundred changes in thirty seconds after which Safari stops a page. A page that cannot change its address (a sandboxed frame) is left as it is, and nothing throws.

## Smaller pieces

- `readParams(search?)` and `readParam(key, search?)`: the parameters of an address (the first of a repeated one).
- `applyParams(search, changes, defaults?)`: a search string with the changes made (`?a=1` or an empty string), the pure core of every write.
- `createAddressWriter({ delay, host })`: `write(compute)`, `flush()`, `cancel()`. `compute` gets the search string when the write happens, and the latest of calls inside the delay is the one that runs. The view controls write
  their address through this, with the same quarter-second delay as before.

## Looking at it

`demo/address.html` is a name, a size and dots kept in the address beside the theme switch and the language picker, which share the state; it lists each change it hears. `pnpm test:demo` plays it in Chromium and WebKit
at a phone's width and a desk's (`e2e/address-state.demo.mjs`): a plain address for the starting choices, a choice written and taken off again, Reset, a page opened on an address, other parameters kept, no history added,
back and forward followed, typing written once after a pause, a page that cannot change its address. 48 px controls, light and dark. Unit tests in `test/address-state.test.ts` run it against a stand-in page.
