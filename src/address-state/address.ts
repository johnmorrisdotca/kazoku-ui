// Choices kept in the page's address, without an element: read, write and watch the parameters of `?a=1&b=2` with `replaceState` (no history entry for a choice).
// Every function that touches the page takes a `host` (the `window` by default), so a test can give it a stand-in. Nothing here touches the DOM until it is called.

/** What a parameter may be set to. `null` and `undefined` take it off the address. */
export type AddressValue = string | number | null | undefined;

/** The part of `window` the address needs: where we are, and how to change it without a history entry. */
export interface AddressHost {
  location: { search: string; pathname: string; hash: string };
  history: { state: unknown; replaceState(state: unknown, unused: string, url: string): void };
  addEventListener?(type: "popstate", listener: () => void): void;
  removeEventListener?(type: "popstate", listener: () => void): void;
}

/** The parameters of an address' search string. A repeated one keeps its first value. */
export function readParams(search: string = globalThis.location?.search ?? ""): Record<string, string> {
  const found: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(search)) if (!(key in found)) found[key] = value;
  return found;
}

/** One parameter of an address' search string, or `null`. */
export function readParam(key: string, search: string = globalThis.location?.search ?? ""): string | null {
  return new URLSearchParams(search).get(key);
}

/**
 * A search string with `changes` made to it: a value sets the parameter, `null` or `undefined` takes it off, and a value equal to that key's entry in `defaults` takes it off too
 * (a choice at its start leaves the address plain). Other parameters are kept in their order. The result is `?a=1` or an empty string.
 */
export function applyParams(search: string, changes: Readonly<Record<string, AddressValue>>, defaults: Readonly<Record<string, string>> = {}): string {
  const query = new URLSearchParams(search);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || String(value) === defaults[key]) query.delete(key);
    else query.set(key, String(value));
  }
  return query.size > 0 ? `?${query}` : "";
}

export interface AddressWriterOptions {
  /** Milliseconds a write waits so that many changes become one: Safari stops a page that changes its address more than a hundred times in thirty seconds. 250 by default; 0 writes at once. */
  delay?: number;
  host?: AddressHost;
}

export interface AddressWriter {
  /** Asks for the address to become `compute(its search string now)`. Calls inside the delay are one write, and `compute` is the latest, run when the time is up. */
  write(compute: (search: string) => string): void;
  /** Writes now what is waiting. */
  flush(): void;
  /** Drops what is waiting. */
  cancel(): void;
}

/** Writes the address in place (`replaceState`), the pathname and hash kept. A page that cannot change its address (a sandboxed frame) is left as it is: nothing throws. */
export function createAddressWriter(options: AddressWriterOptions = {}): AddressWriter {
  const delay = options.delay ?? 250;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest: ((search: string) => string) | undefined;
  const run = (): void => {
    const compute = latest;
    latest = undefined;
    if (compute === undefined) return;
    try {
      const host = options.host ?? (globalThis as unknown as AddressHost);
      const next = compute(host.location.search);
      if (next !== host.location.search) host.history.replaceState(host.history.state, "", `${host.location.pathname}${next}${host.location.hash}`);
    } catch {
      /* an address that cannot be changed: the choices still work */
    }
  };
  const clear = (): void => {
    if (timer !== undefined) globalThis.clearTimeout(timer);
    timer = undefined;
  };
  return {
    write(compute) {
      latest = compute;
      if (delay <= 0) return run();
      if (timer !== undefined) return;
      timer = globalThis.setTimeout(() => {
        timer = undefined;
        run();
      }, delay);
    },
    flush() {
      clear();
      run();
    },
    cancel() {
      clear();
      latest = undefined;
    },
  };
}

/** What a subscriber is told. */
export interface AddressChange {
  key: string;
  /** What the address holds for the key now: the string, or `null` when it is not there. */
  value: string | null;
  /** What it held before; `null` when it was not there. */
  previous: string | null;
  /** `set` (a `set`, `setMany` or `remove` on a state of this page) or `navigation` (the reader went back or forward to another address). */
  source: "set" | "navigation";
}

export interface AddressStateOptions {
  /** A key's start: a value equal to it is left off the address, and `get` gives it when the address has none. */
  defaults?: Readonly<Record<string, string>>;
  /** As for `createAddressWriter`. */
  delay?: number;
  host?: AddressHost;
}

export interface AddressState {
  /** The key's value as the page will have it (a change still waiting included), else its default, else `null`. */
  get(key: string): string | null;
  /** Whether the address (or a change waiting) holds the key. */
  has(key: string): boolean;
  /** Every parameter, as `get` sees them. */
  all(): Record<string, string>;
  /** Sets a key; `null`, `undefined` or the key's default takes it off. Subscribers hear it now; the address is written after the delay. */
  set(key: string, value: AddressValue): void;
  setMany(values: Readonly<Record<string, AddressValue>>): void;
  remove(key: string): void;
  /** Hears every change to the address made through a state of this page, and the reader going back or forward. `keys` limits it to those keys. Returns the way to stop. */
  subscribe(listener: (change: AddressChange) => void, keys?: readonly string[]): () => void;
  /** Writes what is waiting. */
  flush(): void;
  /** Writes what is waiting and stops listening for back and forward. */
  destroy(): void;
}

type Listener = { run: (change: AddressChange) => void; keys: readonly string[] | undefined };
/** What the states of one page share: who is listening, what the address held when last told, and the one back-and-forward listener. */
interface Room {
  listeners: Set<Listener>;
  seen: Record<string, string>;
  onNavigation: () => void;
  attached: boolean;
}
const rooms = new WeakMap<object, Room>();

function roomOf(host: AddressHost): Room {
  let room = rooms.get(host);
  if (room === undefined) {
    const made: Room = {
      listeners: new Set(),
      seen: readParams(host.location.search),
      attached: false,
      onNavigation: () => {
        const now = readParams(host.location.search);
        const before = made.seen;
        made.seen = now;
        for (const key of new Set([...Object.keys(before), ...Object.keys(now)])) {
          if (before[key] !== now[key]) tell(made, { key, value: now[key] ?? null, previous: before[key] ?? null, source: "navigation" });
        }
      },
    };
    rooms.set(host, (room = made));
  }
  return room;
}

function tell(room: Room, change: AddressChange): void {
  for (const listener of [...room.listeners]) if (listener.keys === undefined || listener.keys.includes(change.key)) listener.run(change);
}

export function createAddressState(options: AddressStateOptions = {}): AddressState {
  const host = options.host ?? (globalThis as unknown as AddressHost);
  const defaults = options.defaults ?? {};
  const writer = createAddressWriter({ ...(options.delay !== undefined ? { delay: options.delay } : {}), host });
  const room = roomOf(host);
  /** What was asked and has not been written yet: a key and its value, `null` for off. */
  const queue = new Map<string, string | null>();
  const mine = new Set<Listener>();

  const held = (key: string): string | null => (queue.has(key) ? (queue.get(key) as string | null) : (readParams(host.location.search)[key] ?? null));
  const detach = (listener: Listener): void => {
    mine.delete(listener);
    room.listeners.delete(listener);
    if (room.listeners.size === 0 && room.attached) {
      host.removeEventListener?.("popstate", room.onNavigation);
      room.attached = false;
    }
  };

  const state: AddressState = {
    get: (key) => held(key) ?? defaults[key] ?? null,
    has: (key) => held(key) !== null,
    all() {
      const now: Record<string, string> = { ...readParams(host.location.search) };
      for (const [key, value] of queue) {
        if (value === null) delete now[key];
        else now[key] = value;
      }
      return now;
    },
    set: (key, value) => state.setMany({ [key]: value }),
    setMany(values) {
      const changes: AddressChange[] = [];
      for (const [key, raw] of Object.entries(values)) {
        const value = raw === null || raw === undefined || String(raw) === defaults[key] ? null : String(raw);
        const previous = held(key);
        queue.set(key, value);
        if (value !== previous) changes.push({ key, value, previous, source: "set" });
      }
      writer.write((search) => {
        const next = applyParams(search, Object.fromEntries(queue), defaults);
        queue.clear();
        room.seen = readParams(next);
        return next;
      });
      for (const change of changes) tell(room, change);
    },
    remove: (key) => state.set(key, null),
    subscribe(run, keys) {
      const listener: Listener = { run, keys };
      mine.add(listener);
      room.listeners.add(listener);
      if (!room.attached) {
        room.attached = true;
        host.addEventListener?.("popstate", room.onNavigation);
      }
      return () => detach(listener);
    },
    flush: () => writer.flush(),
    destroy() {
      writer.flush();
      for (const listener of [...mine]) detach(listener);
    },
  };
  return state;
}
