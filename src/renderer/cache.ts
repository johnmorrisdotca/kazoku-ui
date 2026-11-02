// Shared assets with reference counts: a geometry, a material, a texture or a loaded model is made once for everyone who asks for its key, and disposed when
// the last one lets go (after a short linger, so a view that lets go just before the next takes the same thing does not rebuild it). Nothing here knows about
// three.js; the `dispose` you pass says how to free a thing. A model that loads asynchronously is cached as its promise.

export interface Timers {
  set(callback: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export interface AssetCacheOptions {
  /** Milliseconds an asset with no users is kept before it is disposed (1000). 0 disposes at once. */
  lingerMs?: number;
  timers?: Timers;
}

export interface AssetCacheStats {
  /** Assets held, with or without users. */
  entries: number;
  /** Users of assets, in all. */
  refs: number;
  /** Asks answered from the cache. */
  hits: number;
  /** Asks that made the asset. */
  misses: number;
  /** Assets disposed. */
  disposed: number;
}

/** What one view takes: it asks for assets through its scope and lets all of them go with one `release()`. */
export interface AssetScope {
  acquire<T>(key: string, make: () => T, dispose?: (value: T) => void): T;
  release(): void;
}

export interface AssetCache {
  /** The asset for `key`, made by `make` the first time. Every `acquire` needs a `release` of the same key (a scope does that for you). `dispose` is kept from the first ask. */
  acquire<T>(key: string, make: () => T, dispose?: (value: T) => void): T;
  release(key: string): void;
  scope(): AssetScope;
  /** Dispose every asset now, used or not (the page is done with the renderer). */
  clear(): void;
  stats(): AssetCacheStats;
}

interface Entry {
  value: unknown;
  refs: number;
  dispose: ((value: never) => void) | undefined;
  timer: unknown;
}

const defaultTimers: Timers = { set: (callback, ms) => setTimeout(callback, ms), clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>) };

export function createAssetCache(options: AssetCacheOptions = {}): AssetCache {
  const lingerMs = options.lingerMs ?? 1000;
  const timers = options.timers ?? defaultTimers;
  const entries = new Map<string, Entry>();
  const counts = { hits: 0, misses: 0, disposed: 0 };

  const drop = (key: string): void => {
    const entry = entries.get(key);
    if (entry === undefined) return;
    entries.delete(key);
    if (entry.timer !== undefined) timers.clear(entry.timer);
    counts.disposed += 1;
    (entry.dispose as ((value: unknown) => void) | undefined)?.(entry.value);
  };

  const cache: AssetCache = {
    acquire(key, make, dispose) {
      const held = entries.get(key);
      if (held !== undefined) {
        counts.hits += 1;
        if (held.timer !== undefined) {
          timers.clear(held.timer);
          held.timer = undefined;
        }
        held.refs += 1;
        return held.value as never;
      }
      counts.misses += 1;
      const value = make();
      entries.set(key, { value, refs: 1, dispose: dispose as ((value: never) => void) | undefined, timer: undefined });
      return value;
    },
    release(key) {
      const entry = entries.get(key);
      if (entry === undefined || entry.refs === 0) return;
      entry.refs -= 1;
      if (entry.refs > 0) return;
      if (lingerMs > 0) entry.timer = timers.set(() => {
          if (entry.refs === 0) drop(key);
        }, lingerMs);
      else drop(key);
    },
    scope() {
      const taken: string[] = [];
      return {
        acquire(key, make, dispose) {
          taken.push(key);
          return cache.acquire(key, make, dispose);
        },
        release() {
          for (const key of taken.splice(0)) cache.release(key);
        },
      };
    },
    clear() {
      for (const key of [...entries.keys()]) drop(key);
    },
    stats() {
      let refs = 0;
      for (const entry of entries.values()) refs += entry.refs;
      return { entries: entries.size, refs, ...counts };
    },
  };
  return cache;
}

/** Free what a loaded model holds (its geometries, materials and the textures of those), for a `dispose` that frees a whole scene. Duck-typed, so it needs no three.js import. */
export function disposeDeep(root: unknown): void {
  const seen = new Set<unknown>();
  const free = (thing: unknown): void => {
    if (typeof thing !== "object" || thing === null || seen.has(thing)) return;
    seen.add(thing);
    const object = thing as { dispose?: () => void; [key: string]: unknown };
    for (const value of Object.values(object)) {
      // A texture sits in a material's own property (map, normalMap, ...); an object's own children are walked by `traverse` below.
      if (typeof value === "object" && value !== null && (value as { isTexture?: boolean }).isTexture === true) free(value);
    }
    object.dispose?.();
  };
  const visit = (node: unknown): void => {
    const object = node as { geometry?: unknown; material?: unknown };
    free(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) free(material);
  };
  const walk = root as { traverse?: (callback: (node: unknown) => void) => void };
  if (typeof walk?.traverse === "function") walk.traverse(visit);
  else visit(root);
}
