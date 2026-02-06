import type { ParseError, ParsedRecord } from "../interfaces.js";
import type { Result } from "../result.js";
import type { FileCursor } from "./interfaces.js";
import { readLines } from "../read-lines.js";

/**
 * Skips the first `count` items from an async iterable.
 */
export async function* skipFirstN<T>(
  iterable: AsyncIterable<T>,
  count: number,
): AsyncIterable<T> {
  let skipped = 0;
  for await (const item of iterable) {
    if (skipped < count) {
      skipped++;
      continue;
    }
    yield item;
  }
}

/**
 * Wraps a stream of parsed records, tracking the cursor position as items
 * flow through. `skipLines` is the number of lines already skipped (from a
 * previous run) — it becomes the starting value of `cursor.linesProcessed`.
 * After the stream is fully consumed, `cursor` is ready to persist directly.
 * `count` reflects only the items seen in this run (used to detect no-op runs).
 */
export function trackCursor<TRecord>(
  iterable: AsyncIterable<Result<ParsedRecord<TRecord>, ParseError>>,
  skipLines: number,
): {
  records: AsyncIterable<Result<ParsedRecord<TRecord>, ParseError>>;
  state: { cursor: FileCursor; count: number };
} {
  const state = {
    cursor: { linesProcessed: skipLines, lastLine: "" },
    count: 0,
  };

  async function* tracked(): AsyncIterable<
    Result<ParsedRecord<TRecord>, ParseError>
  > {
    for await (const item of iterable) {
      state.count++;
      state.cursor.linesProcessed++;
      state.cursor.lastLine = item.success
        ? item.value.rawLine
        : item.error.content;
      yield item;
    }
  }

  return { records: tracked(), state };
}

/**
 * Reads the Nth line (1-based) from a file. Returns null if the file has fewer lines.
 */
async function readNthLine(
  filePath: string,
  n: number,
): Promise<string | null> {
  const rl = readLines(filePath);

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber++;
    if (lineNumber === n) {
      rl.close();
      return line;
    }
  }

  return null; // File has fewer than N lines
}

/**
 * Verifies the cursor against the file. Returns the number of lines to skip,
 * or 0 if the file was modified/rotated since the last run.
 */
export async function determineSkipLines(
  inputPath: string,
  cursor: FileCursor | null,
): Promise<number> {
  if (!cursor) {
    return 0;
  }

  const lineAtCursor = await readNthLine(inputPath, cursor.linesProcessed);

  if (lineAtCursor === cursor.lastLine) {
    return cursor.linesProcessed; // Safe to skip
  }

  return 0; // File changed, process from beginning
}
