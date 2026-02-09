import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ModeComponents } from "../registry.js";
import type { Logger } from "../logger.js";
import { loadState, saveStateAtomic } from "./state.js";
import { determineSkipLines, skipFirstN, trackCursor } from "./resume.js";

interface PipelineOptions {
  inputPath: string;
  outputDir: string;
  modeName: string;
  components: ModeComponents<unknown, unknown>;
  logger: Logger;
}

export async function runPipeline(options: PipelineOptions) {
  const { inputPath, outputDir, modeName, logger } = options;
  const { parser, processor, reporter } = options.components;

  // Setup output directory
  const dataDir = join(outputDir, modeName, "state");
  const reportsDir = join(outputDir, modeName, "report");
  await mkdir(dataDir, { recursive: true });
  await mkdir(reportsDir, { recursive: true });

  // Load existing state
  const loadedState = await loadState(dataDir);
  const cursor = loadedState ? loadedState.cursor : null;
  const stateData = loadedState ? loadedState.data : null;

  // Determine where to resume
  const skipLines = await determineSkipLines(inputPath, cursor);
  logger.info(`Skipping ${skipLines.toLocaleString()} lines`);

  // Build the processing pipeline:
  // parse → skip already-processed lines → track cursor → process
  const allRecords = parser.parse(inputPath);
  const resumedRecords =
    skipLines > 0 ? skipFirstN(allRecords, skipLines) : allRecords;
  const { records, state: trackCursorState } = trackCursor(
    resumedRecords,
    skipLines,
  );
  const newResult = await processor.process(records, { logger });

  // Merge with existing state (if resuming, existing state is present)
  const finalResult = stateData
    ? processor.merge(stateData, newResult)
    : newResult;

  // Persist results (skip if nothing new was processed)
  if (trackCursorState.count > 0) {
    await saveStateAtomic(dataDir, trackCursorState.cursor, finalResult);
  }

  // Generate report
  await reporter.report(finalResult, reportsDir);
}
