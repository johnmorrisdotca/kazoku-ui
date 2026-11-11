import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { applyParams, createAddressState, createAddressWriter, readParam, readParams, type AddressChange, type AddressHost } from "../src/address-state/address.ts";

/** A stand-in page: an address, a history that only replaces, and the back button. */
function page(url = "/p?x=1#top") {
  const listeners = new Set<() => void>();
  const log: string[] = [];
  const host = {
    location: { search: "", pathname: "", hash: "" },
    history: {
      state: null as unknown,
      replaceState(_state: unknown, _unused: string, next: string) {
        log.push(next);
        go(next);
      },
    },
    addEventListener: (_type: "popstate", listener: () => void) => void listeners.add(listener),
    removeEventListener: (_type: "popstate", listener: () => void) => void listeners.delete(listener),
  } satisfies AddressHost;
  function go(next: string) {
    const parsed = new URL(next, "http://x");
    host.location.search = parsed.search;
    host.location.pathname = parsed.pathname;
    host.location.hash = parsed.hash;
  }
  go(url);
  return { host, log, listeners, back: (to: string) => { go(to); for (const listener of [...listeners]) listener(); } };
}

test("the parameters of an address", () => {
  assert.deepEqual(readParams("?a=1&b=two&a=3"), { a: "1", b: "two" });
  assert.deepEqual(readParams(""), {});
  assert.equal(readParam("b", "?a=1&b=two"), "two");
  assert.equal(readParam("c", "?a=1"), null);
});

test("a change sets, replaces or takes off a parameter and keeps the others in their order", () => {
  assert.equal(applyParams("", { a: "1" }), "?a=1");
  assert.equal(applyParams("?x=1&a=1&y=2", { a: "2" }), "?x=1&a=2&y=2");
  assert.equal(applyParams("?x=1&a=1", { a: null }), "?x=1");
  assert.equal(applyParams("?a=1", { a: undefined }), "");
  assert.equal(applyParams("?a=1", { a: 2.5, b: 0 }), "?a=2.5&b=0");
});

test("a value equal to its default leaves the address plain", () => {
  assert.equal(applyParams("?size=l", { size: "m" }, { size: "m" }), "");
  assert.equal(applyParams("", { size: "m", dots: "1" }, { size: "m" }), "?dots=1");
  assert.equal(applyParams("", { n: 3 }, { n: "3" }), "");
});

test("a writer replaces the address in place, keeping the path and the hash, and says nothing when nothing changed", () => {
  const { host, log } = page("/p?x=1#top");
  const writer = createAddressWriter({ delay: 0, host });
  writer.write((search) => applyParams(search, { a: "1" }));
  assert.deepEqual(log, ["/p?x=1&a=1#top"]);
  writer.write((search) => search);
  assert.equal(log.length, 1);
});

test("calls inside the delay are one write, made with the latest, and flush and cancel", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { host, log } = page("/p");
    const writer = createAddressWriter({ delay: 250, host });
    writer.write((search) => applyParams(search, { a: "1" }));
    writer.write((search) => applyParams(search, { a: "2" }));
    writer.write((search) => applyParams(search, { a: "3" }));
    assert.deepEqual(log, []);
    mock.timers.tick(249);
    assert.deepEqual(log, []);
    mock.timers.tick(1);
    assert.deepEqual(log, ["/p?a=3"]);
    writer.write((search) => applyParams(search, { a: "4" }));
    writer.flush();
    assert.deepEqual(log, ["/p?a=3", "/p?a=4"]);
    writer.write((search) => applyParams(search, { a: "5" }));
    writer.cancel();
    mock.timers.tick(1000);
    assert.equal(log.length, 2);
  } finally {
    mock.timers.reset();
  }
});

test("an address that cannot be changed does not throw", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const warn = mock.method(console, "warn", () => undefined);
  try {
    const { host } = page("/p");
    host.history.replaceState = () => {
      throw new Error("sandboxed");
    };
    const writer = createAddressWriter({ delay: 0, host });
    assert.doesNotThrow(() => writer.write((search) => applyParams(search, { a: "1" })));
    assert.doesNotThrow(() => mock.timers.tick(1000));
  } finally {
    warn.mock.restore();
    mock.timers.reset();
  }
});

test("a write the page refuses is kept and tried once more after a second, and a newer write in that second is the one tried", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { host, log } = page("/p");
    const real = host.history.replaceState.bind(host.history);
    let refusals = 1;
    host.history.replaceState = (state: unknown, unused: string, next: string) => {
      if (refusals > 0) {
        refusals -= 1;
        throw new Error("SecurityError: too many calls");
      }
      real(state, unused, next);
    };
    const writer = createAddressWriter({ delay: 250, host });
    writer.write((search) => applyParams(search, { pace: "0.5" }));
    mock.timers.tick(250);
    assert.deepEqual(log, [], "refused");
    mock.timers.tick(999);
    assert.deepEqual(log, []);
    mock.timers.tick(1);
    assert.deepEqual(log, ["/p?pace=0.5"], "tried again after a second");
    // refused again, then a newer choice inside the second: the newer one is written
    refusals = 1;
    writer.write((search) => applyParams(search, { pace: null }));
    mock.timers.tick(250);
    writer.write((search) => applyParams(search, { pace: "2" }));
    mock.timers.tick(1000);
    assert.deepEqual(log, ["/p?pace=0.5", "/p?pace=2"]);
  } finally {
    mock.timers.reset();
  }
});

test("a page that refuses twice is left alone after one warning, with no timer kept", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const warn = mock.method(console, "warn", () => undefined);
  try {
    const { host } = page("/p");
    let tries = 0;
    host.history.replaceState = () => {
      tries += 1;
      throw new Error("sandboxed");
    };
    const writer = createAddressWriter({ delay: 250, host });
    writer.write((search) => applyParams(search, { a: "1" }));
    mock.timers.tick(250);
    mock.timers.tick(1000);
    assert.equal(tries, 2);
    assert.equal(warn.mock.callCount(), 1);
    mock.timers.tick(60_000);
    assert.equal(tries, 2, "no timer left that tries again");
    // a later write is tried the same way, and the warning is not repeated
    writer.write((search) => applyParams(search, { a: "2" }));
    mock.timers.tick(250);
    mock.timers.tick(1000);
    assert.equal(tries, 4);
    assert.equal(warn.mock.callCount(), 1);
  } finally {
    warn.mock.restore();
    mock.timers.reset();
  }
});

test("a state reads what is in the address, gives a default, and sees its own change at once", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { host, log } = page("/p?size=l");
    const state = createAddressState({ host, defaults: { size: "m", dots: "0" } });
    assert.equal(state.get("size"), "l");
    assert.equal(state.get("dots"), "0");
    assert.equal(state.get("nope"), null);
    assert.equal(state.has("size"), true);
    assert.equal(state.has("dots"), false);
    state.set("name", "Ann");
    assert.equal(state.get("name"), "Ann");
    assert.deepEqual(state.all(), { size: "l", name: "Ann" });
    assert.deepEqual(log, [], "written after the delay, not at once");
    state.set("size", "m");
    assert.equal(state.get("size"), "m");
    assert.equal(state.has("size"), false);
    mock.timers.tick(250);
    assert.deepEqual(log, ["/p?name=Ann"]);
  } finally {
    mock.timers.reset();
  }
});

test("with no delay each change is written at once, and setMany is one write", () => {
  const { host, log } = page("/p");
  const state = createAddressState({ host, delay: 0 });
  state.set("a", 1);
  state.setMany({ b: "2", c: "3" });
  state.remove("a");
  assert.deepEqual(log, ["/p?a=1", "/p?a=1&b=2&c=3", "/p?b=2&c=3"]);
});

test("a subscriber hears each change, with what it was; one that did not change is not heard", () => {
  const { host } = page("/p?a=1");
  const state = createAddressState({ host, delay: 0, defaults: { d: "x" } });
  const heard: AddressChange[] = [];
  const stop = state.subscribe((change) => heard.push(change));
  state.set("a", "2");
  state.set("a", "2");
  state.set("b", "new");
  state.remove("a");
  state.set("d", "x");
  assert.deepEqual(heard, [
    { key: "a", value: "2", previous: "1", source: "set" },
    { key: "b", value: "new", previous: null, source: "set" },
    { key: "a", value: null, previous: "2", source: "set" },
  ]);
  stop();
  state.set("b", "again");
  assert.equal(heard.length, 3);
});

test("subscribers can be limited to some keys, and states of one page hear each other", () => {
  const { host } = page("/p");
  const one = createAddressState({ host, delay: 0 });
  const two = createAddressState({ host, delay: 0 });
  const heard: string[] = [];
  one.subscribe((change) => heard.push(change.key), ["theme"]);
  two.set("theme", "dark");
  two.set("lang", "ja");
  assert.deepEqual(heard, ["theme"]);
});

test("going back or forward is heard, once, as navigation", () => {
  const { host, back, listeners } = page("/p?a=1&b=2");
  const state = createAddressState({ host, delay: 0 });
  const heard: AddressChange[] = [];
  const stop = state.subscribe((change) => heard.push(change));
  assert.equal(listeners.size, 1);
  state.set("a", "9");
  heard.length = 0;
  back("/p?a=1&c=3");
  assert.deepEqual(
    heard.sort((x, y) => x.key.localeCompare(y.key)),
    [
      { key: "a", value: "1", previous: "9", source: "navigation" },
      { key: "b", value: null, previous: "2", source: "navigation" },
      { key: "c", value: "3", previous: null, source: "navigation" },
    ],
  );
  assert.equal(state.get("c"), "3");
  stop();
  assert.equal(listeners.size, 0, "the back-and-forward listener goes with the last subscriber");
});

test("destroy writes what waits and stops listening", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { host, log, listeners } = page("/p");
    const state = createAddressState({ host });
    state.subscribe(() => {});
    state.set("a", "1");
    assert.deepEqual(log, []);
    state.destroy();
    assert.deepEqual(log, ["/p?a=1"]);
    assert.equal(listeners.size, 0);
  } finally {
    mock.timers.reset();
  }
});
