import { Command } from "commander";
import { execute } from "./cli/execute.js";
import { registry } from "./core/registry.js";
import { HttpAccessParser } from "./parsers/http-access-parser.js";
import { HttpAccessProcessor } from "./processors/http-access/processor.js";
import { HttpAccessHtmlReporter } from "./reporters/http-access/html-reporter.js";
import { SyslogParser } from "./parsers/syslog-parser.js";
import { SyslogAppsProcessor } from "./processors/syslog-apps/processor.js";
import { SyslogAppsHtmlReporter } from "./reporters/syslog-apps/html-reporter.js";

registry.registerMode("http-access", {
  parser: new HttpAccessParser(),
  processor: new HttpAccessProcessor(),
  reporter: new HttpAccessHtmlReporter(),
});

registry.registerMode("syslog-apps", {
  parser: new SyslogParser(),
  processor: new SyslogAppsProcessor(),
  reporter: new SyslogAppsHtmlReporter(),
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
  .requiredOption("-m, --mode <mode>", `analysis mode (${availableModes}) `)
  .option("-c, --config <path>", "config file path (for modes requiring it)")
  .action(async (options) => {
    await execute(
      options.mode,
      options.input,
      options.outputDir,
      options.config,
    );
  });

program.parse();
