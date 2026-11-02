// Stills: a picture of a view, made once and shown whenever the view is not live. They sit in a least-recently-used list with a byte budget, so a wall of
// hundreds of views holds only the pictures it has used lately; an evicted picture is made again when its view next needs it.

export interface Still {
  /** An object URL (or any image URL) for an `<img>`. */
  url: string;
  width: number;
  height: number;
  /** What it costs in memory once decoded: width x height x 4. */
  bytes: number;
}

export interface StillCacheOptions {
  /** The most decoded bytes the list may hold (32 MB). The picture just set is always kept. */
  maxBytes?: number;
  /** Called with a picture that leaves the list, to revoke its URL (`URL.revokeObjectURL` by default). */
  free?: (still: Still) => void;
  onEvict?: (key: string, still: Still) => void;
}

export interface StillCache {
  /** The picture for `key`, marked as just used. */
  get(key: string): Still | undefined;
  set(key: string, still: Still): void;
  delete(key: string): void;
  clear(): void;
  readonly bytes: number;
  readonly size: number;
  keys(): string[];
}

export const STILL_BYTES = 32 * 1024 * 1024;

export function createStillCache(options: StillCacheOptions = {}): StillCache {
  const maxBytes = options.maxBytes ?? STILL_BYTES;
  const free = options.free ?? ((still: Still) => globalThis.URL?.revokeObjectURL?.(still.url));
  const list = new Map<string, Still>();
  let total = 0;

  const remove = (key: string): void => {
    const still = list.get(key);
    if (still === undefined) return;
    list.delete(key);
    total -= still.bytes;
    free(still);
    options.onEvict?.(key, still);
  };

  return {
    get(key) {
      const still = list.get(key);
      if (still === undefined) return undefined;
      list.delete(key);
      list.set(key, still);
      return still;
    },
    set(key, still) {
      remove(key);
      list.set(key, still);
      total += still.bytes;
      for (const old of [...list.keys()]) {
        if (total <= maxBytes || old === key) break;
        remove(old);
      }
    },
    delete: remove,
    clear() {
      for (const key of [...list.keys()]) remove(key);
    },
    get bytes() {
      return total;
    },
    get size() {
      return list.size;
    },
    keys: () => [...list.keys()],
  };
}
