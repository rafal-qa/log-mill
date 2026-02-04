import { Command } from "commander";
import { runPipeline } from "./core/pipeline.js";
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

const program = new Command();

program
  .name("log-mill")
  .description("Analyze log files and generate reports")
  .requiredOption("-i, --input <path>", "Input log file path")
  .requiredOption(
    "-d, --output-dir <path>",
    "Output directory for reports and state",
  )
  .requiredOption("-m, --mode <mode>", "Analysis mode (e.g., http-access)")
  .action(async (options) => {
    const logger = new ConsoleLogger();

    const result = await runPipeline({
      inputPath: options.input,
      outputDir: options.outputDir,
      mode: options.mode,
      logger,
    });

    // Final newline after progress output
    console.error("");

    if (!result.success) {
      logger.error(result.error.message);
      process.exit(1);
    }

    logger.info(`Report generated in: ${options.outputDir}/reports/`);
    process.exit(0);
  });

program.parse();
