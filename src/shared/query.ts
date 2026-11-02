// One parameter of the page's address, read and written in place with `replaceState` (no history entry). A page that cannot change its address (a sandboxed frame,
// Safari after too many changes) keeps working: the write is skipped.
export function readParam(key: string, search: string = globalThis.location?.search ?? ""): string | null {
  return new URLSearchParams(search).get(key);
}

/** Sets the parameter, or removes it for `null`, keeping every other parameter and the hash. */
export function writeParam(key: string, value: string | null): void {
  try {
    const query = new URLSearchParams(globalThis.location.search);
    if (value === null) query.delete(key);
    else query.set(key, value);
    const next = query.size > 0 ? `?${query}` : "";
    if (next !== globalThis.location.search) globalThis.history.replaceState(globalThis.history.state, "", `${globalThis.location.pathname}${next}${globalThis.location.hash}`);
  } catch {
    /* an address that cannot be changed: the choice still works */
  }
}
