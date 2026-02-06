import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { ok, err } from "../result.js";
import type { ParseError, ParsedRecord } from "../interfaces.js";
import type { Result } from "../result.js";
import { trackCursor, determineSkipLines } from "./resume.js";
import type { FileCursor } from "./interfaces.js";

describe("trackCursor - wraps stream and captures cursor position", () => {
  it("yields all records unchanged", async () => {
    const records: Array<Result<ParsedRecord<{ id: number }>, ParseError>> = [
      ok({ record: { id: 1 }, rawLine: "line 1" }),
      ok({ record: { id: 2 }, rawLine: "line 2" }),
      ok({ record: { id: 3 }, rawLine: "line 3" }),
    ];

    async function* stream() {
      for (const r of records) yield r;
    }

    const { records: tracked } = trackCursor(stream(), 0);

    const collected = [];
    for await (const item of tracked) {
      collected.push(item);
    }

    expect(collected).toEqual(records);
  });

  it("captures final position after consuming stream", async () => {
    const records: Array<Result<ParsedRecord<{ id: number }>, ParseError>> = [
      ok({ record: { id: 1 }, rawLine: "line 1" }),
      ok({ record: { id: 2 }, rawLine: "line 2" }),
      ok({ record: { id: 3 }, rawLine: "line 3" }),
    ];

    async function* stream() {
      for (const r of records) yield r;
    }

    const { records: tracked, state } = trackCursor(stream(), 0);

    for await (const _ of tracked) {
      // consume
    }

    expect(state.count).toBe(3);
    expect(state.cursor.linesProcessed).toBe(3);
    expect(state.cursor.lastLine).toBe("line 3");
  });

  it("continues from previous position when resuming", async () => {
    const records: Array<Result<ParsedRecord<{ id: number }>, ParseError>> = [
      ok({ record: { id: 1 }, rawLine: "line 11" }),
      ok({ record: { id: 2 }, rawLine: "line 12" }),
    ];

    async function* stream() {
      for (const r of records) yield r;
    }

    const { records: tracked, state } = trackCursor(stream(), 10);

    for await (const _ of tracked) {
      // consume
    }

    expect(state.count).toBe(2);
    expect(state.cursor.linesProcessed).toBe(12);
    expect(state.cursor.lastLine).toBe("line 12");
  });

  it("captures raw line from successful parse", async () => {
    const records: Array<Result<ParsedRecord<{ id: number }>, ParseError>> = [
      ok({ record: { id: 1 }, rawLine: "success line" }),
    ];

    async function* stream() {
      for (const r of records) yield r;
    }

    const { records: tracked, state } = trackCursor(stream(), 0);

    for await (const _ of tracked) {
      // consume
    }

    expect(state.cursor.lastLine).toBe("success line");
  });

  it("captures raw line from parse error", async () => {
    const records: Array<Result<ParsedRecord<{ id: number }>, ParseError>> = [
      err({ line: 1, content: "error line", reason: "parse error" }),
    ];

    async function* stream() {
      for (const r of records) yield r;
    }

    const { records: tracked, state } = trackCursor(stream(), 0);

    for await (const _ of tracked) {
      // consume
    }

    expect(state.cursor.lastLine).toBe("error line");
  });

  it("preserves previous position when stream is empty", async () => {
    async function* emptyStream(): AsyncIterable<
      Result<ParsedRecord<{ id: number }>, ParseError>
    > {
      // yields nothing
    }

    const { records: tracked, state } = trackCursor(emptyStream(), 5);

    for await (const _ of tracked) {
      // consume
    }

    expect(state.count).toBe(0);
    expect(state.cursor.linesProcessed).toBe(5);
    expect(state.cursor.lastLine).toBe("");
  });
});

describe("determineSkipLines - decides where to resume processing", () => {
  const FIXTURE_LOG = join(
    process.cwd(),
    "src/__fixtures__/core/pipeline/sample-5-lines.log",
  );

  it("processes from beginning on first run", async () => {
    const skipLines = await determineSkipLines(FIXTURE_LOG, null);
    expect(skipLines).toBe(0);
  });

  it("skips already-processed lines when file unchanged", async () => {
    const cursor: FileCursor = {
      linesProcessed: 3,
      lastLine: "line 3",
    };

    const skipLines = await determineSkipLines(FIXTURE_LOG, cursor);
    expect(skipLines).toBe(3);
  });

  it("reprocesses from beginning when file modified", async () => {
    const cursor: FileCursor = {
      linesProcessed: 3,
      lastLine: "CHANGED",
    };

    const skipLines = await determineSkipLines(FIXTURE_LOG, cursor);
    expect(skipLines).toBe(0);
  });

  it("reprocesses from beginning when file rotated", async () => {
    const cursor: FileCursor = {
      linesProcessed: 10,
      lastLine: "line 10",
    };

    const skipLines = await determineSkipLines(FIXTURE_LOG, cursor);
    expect(skipLines).toBe(0);
  });
});
