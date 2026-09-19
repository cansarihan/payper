import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * A small map that survives a restart.
 *
 * The challenge store and the rate limiter are meant to be forgotten — they
 * describe something happening right now. A registered passkey and a payout
 * account are not: losing them means a person who signed in yesterday is told
 * their passkey is unknown, and an IBAN typed before a deploy silently reverts
 * to the anchor's default. Both are the kind of quiet data loss that is only
 * noticed at the worst moment.
 *
 * A JSON file rather than a database because these are tens of rows that change
 * a few times an hour. The write goes to a temporary file and is renamed over
 * the target, so a crash mid-write leaves the previous version intact rather
 * than a truncated one.
 */
export interface PersistentMap<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  delete(key: string): boolean;
  values(): T[];
  entries(): [string, T][];
  readonly size: number;
}

const dataDir = () => process.env.PAYPER_DATA_DIR ?? join(process.cwd(), ".data");

export function persistentMap<T>(name: string): PersistentMap<T> {
  const file = join(dataDir(), `${name}.json`);
  const map = new Map<string, T>();

  try {
    const raw = readFileSync(file, "utf8");
    for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, T>)) {
      map.set(k, v);
    }
  } catch {
    // No file yet, or one we cannot parse. Starting empty is the right
    // behaviour for both: a corrupt file should not stop the server booting.
  }

  const flush = () => {
    try {
      mkdirSync(dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      writeFileSync(tmp, JSON.stringify(Object.fromEntries(map), null, 2), "utf8");
      renameSync(tmp, file);
    } catch (e) {
      // The interface has already acted on the change; refusing to continue
      // because the disk is unhappy would be worse than carrying on in memory.
      console.warn(`could not persist ${name}:`, (e as Error).message);
    }
  };

  return {
    get: (k) => map.get(k),
    set(k, v) {
      map.set(k, v);
      flush();
    },
    delete(k) {
      const had = map.delete(k);
      if (had) flush();
      return had;
    },
    values: () => [...map.values()],
    entries: () => [...map.entries()],
    get size() {
      return map.size;
    },
  };
}
