import { readFile, writeFile, rename, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { FileCursor } from "./interfaces.js";

interface PersistedState<T> {
  version: number;
  lastUpdated: string;
  data: T;
}

/**
 * Writes state to a .tmp.json file, then renames atomically to the final path.
 */
export async function saveStateAtomic<T>(
  filePath: string,
  state: PersistedState<T>,
): Promise<void> {
  const tmpPath = filePath.replace(".json", ".tmp.json");

  await writeFile(tmpPath, JSON.stringify(state, null, 2));
  await rename(tmpPath, filePath);
}

/**
 * Loads and parses a PersistedState<T> file. Returns null if the file does not exist.
 */
export async function loadState<T>(
  dataDir: string,
): Promise<PersistedState<T> | null> {
  try {
    const content = await readFile(join(dataDir, "state.json"), "utf-8");
    return JSON.parse(content) as PersistedState<T>;
  } catch {
    return null;
  }
}

/**
 * Loads a FileCursor from cursor.json. Returns null if the file does not exist.
 */
export async function loadCursor(dataDir: string): Promise<FileCursor | null> {
  try {
    const content = await readFile(join(dataDir, "cursor.json"), "utf-8");
    const persisted = JSON.parse(content) as PersistedState<FileCursor>;
    return persisted.data;
  } catch {
    return null;
  }
}

/**
 * Removes any leftover .tmp.json files in the given directory.
 * These are artifacts of interrupted previous runs.
 */
export async function cleanupTempFiles(dataDir: string): Promise<void> {
  const entries = await readdir(dataDir);
  for (const entry of entries) {
    if (entry.endsWith(".tmp.json")) {
      await unlink(join(dataDir, entry));
    }
  }
}
