import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveStateAtomic, loadState } from "./state.js";
import type { FileCursor } from "./interfaces.js";

let testDir: string;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "log-mill-state-test-"));
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("saveStateAtomic + loadState - round-trip persistence", () => {
  it("preserves all data through write and read cycle", async () => {
    const cursor: FileCursor = {
      linesProcessed: 100,
      lastLine: "192.168.1.1 - - [01/Jan/2026:10:00:00 +0000] ...",
    };

    const data = {
      totalRequests: 42,
      uniqueVisitors: 10,
      requestsByDay: {
        "2026-02-01": 15,
        "2026-02-02": 27,
      },
    };

    await saveStateAtomic(testDir, cursor, data);

    const loaded = await loadState(testDir);

    assert(loaded);
    expect(loaded.cursor).toEqual(cursor);
    expect(loaded.data).toEqual(data);
    expect(loaded.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("handles nested objects in data field", async () => {
    const cursor: FileCursor = {
      linesProcessed: 50,
      lastLine: "test line",
    };

    const data = {
      metadata: {
        nested: {
          deeply: {
            value: "test",
          },
        },
      },
      counts: { key1: 10 },
    };

    await saveStateAtomic(testDir, cursor, data);

    const loaded = await loadState(testDir);

    assert(loaded);
    expect(loaded.data).toEqual(data);
  });

  it("returns null when state file does not exist", async () => {
    const loaded = await loadState(testDir);

    expect(loaded).toBeNull();
  });
});
