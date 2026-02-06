import { Command } from "commander";
import { access } from "node:fs/promises";
import { runPipeline } from "./core/pipeline/pipeline.js";
import { ConsoleLogger } from "./core/logger.js";
import { registry } from "./core/registry.js";
import { HttpAccessParser } from "./parsers/http-access-parser.js";
import { HttpAccessProcessor } from "./processors/http-access/processor.js";
import { HttpAccessHtmlReporter } from "./reporters/http-access/html-reporter.js";

const httpAccessParser = new HttpAccessParser();
const httpAccessProcessor = new HttpAccessProcessor();
const httpAccessHtmlReporter = new HttpAccessHtmlReporter();

registry.registerMode("http-access", {
  parser: httpAccessParser,
  processor: httpAccessProcessor,
  reporter: httpAccessHtmlReporter,
});

async function executeCommand(
  modeName: string,
  inputPath: string,
  outputDir: string,
) {
  const logger = new ConsoleLogger();

  const components = registry.getMode(modeName);
  if (!components) {
    const available = registry.getAvailableModes().join(", ");
    logger.error(`Unknown mode: ${modeName}. Available: ${available}`);
    process.exit(1);
  }

  try {
    await access(inputPath);
  } catch {
    logger.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const result = await runPipeline({
    inputPath,
    outputDir,
    modeName,
    components,
    logger,
  });

  // Final newline after progress output
  console.error("");

  if (!result.success) {
    logger.error(result.error.message);
    process.exit(1);
  }

  logger.info(`Report generated in: ${outputDir}/reports/`);
  process.exit(0);
}

const program = new Command("log-mill");

program
  .description("Analyze log files and generate reports")
  .requiredOption(
    "-i, --input <path>",
    "input log file path (plain text or .gz)",
  )
  .requiredOption(
    "-d, --output-dir <path>",
    "output directory for reports and state",
  )
  .requiredOption("-m, --mode <mode>", "analysis mode (e.g., http-access)")
  .action(async (options) => {
    await executeCommand(options.mode, options.input, options.outputDir);
  });

program.parse();
