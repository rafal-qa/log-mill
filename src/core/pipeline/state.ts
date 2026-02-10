import { readFile, writeFile, rename, access } from "node:fs/promises";
import { join } from "node:path";
import type { FileCursor } from "./interfaces.js";

const STATE_FILE = "state.json";
const STATE_TEMP_FILE = "state.tmp.json";

interface ProcessingState {
  lastUpdated: string;
  cursor: FileCursor;
  data: unknown;
}

/**
 * Atomically writes data to a file to prevent corruption from crashes or interruptions.
 *
 * Writes to a temporary file first, then renames it to the target path. The rename
 * operation is atomic on POSIX systems, ensuring the file is either fully written
 * or not written at all — no partial/corrupted state is possible.
 *
 * This matters because if the process crashes or is killed (Ctrl+C) during the write,
 * the original file remains intact and usable.
 */
export async function saveStateAtomic(
  dataDir: string,
  cursor: FileCursor,
  data: unknown,
) {
  const state: ProcessingState = {
    lastUpdated: new Date().toISOString(),
    cursor,
    data,
  };

  const filePath = join(dataDir, STATE_FILE);
  const tmpPath = join(dataDir, STATE_TEMP_FILE);
  await writeFile(tmpPath, JSON.stringify(state, null, 1));
  await rename(tmpPath, filePath);
}

export async function loadState(
  dataDir: string,
): Promise<ProcessingState | null> {
  const filePath = join(dataDir, STATE_FILE);

  try {
    await access(filePath);
  } catch {
    return null;
  }

  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content) as ProcessingState;
}
