import { readFile, writeFile, rename, access } from "node:fs/promises";
import { join } from "node:path";
import { Packr } from "msgpackr";
import type { FileCursor } from "./interfaces.js";

const STATE_FILE = "state.msgpack";
const STATE_TEMP_FILE = "state.tmp.msgpack";

// Configure msgpackr to preserve Maps
const packr = new Packr({
  moreTypes: true, // Enable Map/Set/Error serialization
  mapsAsObjects: false, // Decode maps as JavaScript Maps, not objects
});

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
 * This matters because state files can be large and the write operation may take
 * time. If the process crashes, is killed (Ctrl+C), or the system loses power
 * during the write, the original file remains intact and usable.
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
  await writeFile(tmpPath, packr.pack(state));
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

  const content = await readFile(filePath);
  return packr.unpack(content);
}
