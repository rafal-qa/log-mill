import { Command } from "commander";
import { registry } from "./core/registry.js";
import { HttpAccessParser } from "./parsers/http-access-parser.js";
import { HttpAccessProcessor } from "./processors/http-access/processor.js";
import { HttpAccessHtmlReporter } from "./reporters/http-access/html-reporter.js";
import { executeCommand } from "./cli/execute-command.js";

registry.registerMode("http-access", {
  parser: new HttpAccessParser(),
  processor: new HttpAccessProcessor(),
  reporter: new HttpAccessHtmlReporter(),
});

const availableModes = registry.getAvailableModes().join(", ");

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
  .requiredOption(
    "-m, --mode <mode>",
    `analysis mode (available: ${availableModes}) `,
  )
  .option("-c, --config <path>", "config file path (for modes requiring it)")
  .action(async (options) => {
    await executeCommand(
      options.mode,
      options.input,
      options.outputDir,
      options.config,
    );
  });

program.parse();
