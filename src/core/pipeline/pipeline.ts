import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ModeComponents } from "../registry.js";
import type { Logger } from "../logger.js";
import {
  cleanupTempFiles,
  loadCursor,
  loadState,
  saveStateAtomic,
} from "./state.js";
import type { FileCursor } from "./interfaces.js";
import { determineSkipLines, skipFirstN, trackCursor } from "./resume.js";

async function persistResults(
  dataDir: string,
  finalResult: unknown,
  cursor: FileCursor,
): Promise<void> {
  const now = new Date().toISOString();

  await saveStateAtomic(join(dataDir, "state.json"), {
    version: 1,
    lastUpdated: now,
    data: finalResult,
  });

  await saveStateAtomic(join(dataDir, "cursor.json"), {
    version: 1,
    lastUpdated: now,
    data: cursor,
  });
}

interface PipelineOptions {
  inputPath: string;
  outputDir: string;
  modeName: string;
  components: ModeComponents<unknown, unknown>;
  logger: Logger;
}

export async function runPipeline(options: PipelineOptions): Promise<void> {
  const { inputPath, outputDir, modeName, logger } = options;
  const { parser, processor, reporter } = options.components;

  // Setup output directory
  const dataDir = join(outputDir, "data", modeName);
  const reportsDir = join(outputDir, "reports");
  await mkdir(dataDir, { recursive: true });
  await mkdir(reportsDir, { recursive: true });

  // Clean up temp files from interrupted runs
  await cleanupTempFiles(dataDir);

  // Load existing state and cursor
  const existingState = await loadState(dataDir);
  const cursor = await loadCursor(dataDir);

  // Determine where to resume
  const skipLines = await determineSkipLines(inputPath, cursor);

  // Build the processing pipeline:
  // parse → skip already-processed lines → track cursor → process
  const allRecords = parser.parse(inputPath);
  const resumedRecords =
    skipLines > 0 ? skipFirstN(allRecords, skipLines) : allRecords;
  const { records, state: cursorState } = trackCursor(
    resumedRecords,
    skipLines,
  );
  const newResult = await processor.process(records, { logger });

  // Merge with existing state (if resuming, existing state is present)
  const finalResult = existingState
    ? processor.merge(existingState.data, newResult)
    : newResult;

  // Persist results (skip if nothing new was processed)
  if (cursorState.count > 0) {
    await persistResults(dataDir, finalResult, cursorState.cursor);
  }

  // Generate report
  const reportPath = join(reportsDir, `${modeName}.html`);
  await reporter.report(finalResult, reportPath);
}
