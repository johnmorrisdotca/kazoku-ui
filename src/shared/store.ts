// localStorage, for a choice a page wants to keep on the device. Every use is in a try/catch: a browser that keeps nothing (a private window, blocked site data, a sandboxed frame) is the same as an empty store.
export function localStore(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function remember(key: string, value: string): void {
  try {
    localStore()?.setItem(key, value);
  } catch {
    /* not remembered; the choice still holds for this page */
  }
}
