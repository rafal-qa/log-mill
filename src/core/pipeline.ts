import { mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { type Result, ok, err } from "./types.js";
import { registry } from "./registry.js";
import type { Logger } from "./logger.js";

interface PipelineOptions {
  inputPath: string;
  outputDir: string;
  mode: string;
  logger: Logger;
}

interface PipelineError {
  code: "INVALID_MODE" | "INPUT_NOT_FOUND" | "PIPELINE_ERROR";
  message: string;
}

export async function runPipeline(
  options: PipelineOptions,
): Promise<Result<void, PipelineError>> {
  const { inputPath, outputDir, mode, logger } = options;

  // 1. Resolve mode
  const components = registry.getMode(mode);
  if (!components) {
    return err({
      code: "INVALID_MODE",
      message: `Unknown mode: ${mode}. Available: ${registry.getAvailableModes().join(", ")}`,
    });
  }

  const { parser, processor, reporter } = components;

  // 2. Validate input file exists
  try {
    await access(inputPath);
  } catch {
    return err({
      code: "INPUT_NOT_FOUND",
      message: `Input file not found: ${inputPath}`,
    });
  }

  // 3. Setup output directory
  const reportsDir = join(outputDir, "reports");
  await mkdir(reportsDir, { recursive: true });

  try {
    // 4. Process log file
    const records = parser.parse(inputPath);
    const result = await processor.process(records, { logger });

    // 5. Generate report
    const reportPath = join(reportsDir, `${mode}.html`);
    await reporter.report(result, reportPath);

    return ok(undefined);
  } catch (error) {
    return err({
      code: "PIPELINE_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
