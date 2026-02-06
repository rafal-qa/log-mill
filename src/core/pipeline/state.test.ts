import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveStateAtomic, loadState, loadCursor } from "./state.js";
import type { FileCursor } from "./interfaces.js";

let testDir: string;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "log-mill-state-test-"));
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("saveStateAtomic + loadState - round-trip persistence", () => {
  it("preserves all fields through write and read cycle", async () => {
    const state = {
      version: 1,
      lastUpdated: "2026-02-06T10:00:00Z",
      data: {
        totalRequests: 42,
        uniqueVisitors: 10,
        requestsByDay: {
          "2026-02-01": 15,
          "2026-02-02": 27,
        },
      },
    };

    const filePath = join(testDir, "state.json");
    await saveStateAtomic(filePath, state);

    const loaded = await loadState(testDir);

    expect(loaded).toEqual(state);
  });

  it("handles nested objects in data field", async () => {
    const state = {
      version: 1,
      lastUpdated: "2026-02-06T10:00:00Z",
      data: {
        metadata: {
          nested: {
            deeply: {
              value: "test",
            },
          },
        },
      },
    };

    const filePath = join(testDir, "state.json");
    await saveStateAtomic(filePath, state);

    const loaded = await loadState(testDir);

    expect(loaded).toEqual(state);
  });

  it("returns null when state file does not exist", async () => {
    const loaded = await loadState(testDir);

    expect(loaded).toBeNull();
  });
});

describe("loadCursor - unwraps PersistedState envelope", () => {
  it("returns only data field from PersistedState", async () => {
    const cursor: FileCursor = {
      linesProcessed: 100,
      lastLine: "192.168.1.1 - - [01/Jan/2026:10:00:00 +0000] ...",
    };

    const persisted = {
      version: 1,
      lastUpdated: "2026-02-06T10:00:00Z",
      data: cursor,
    };

    const filePath = join(testDir, "cursor.json");
    await saveStateAtomic(filePath, persisted);

    const loaded = await loadCursor(testDir);

    expect(loaded).toEqual(cursor);
    expect(loaded).not.toHaveProperty("version");
    expect(loaded).not.toHaveProperty("lastUpdated");
  });

  it("returns null when cursor file does not exist", async () => {
    const loaded = await loadCursor(testDir);

    expect(loaded).toBeNull();
  });
});
