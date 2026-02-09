import { registry } from "../core/registry.js";
import { isConfigurable } from "../core/interfaces.js";
import { ConsoleLogger } from "../core/logger.js";
import { runPipeline } from "../core/pipeline/pipeline.js";
import { access } from "node:fs/promises";
import { loadConfig } from "./load-config.js";

export async function executeCommand(
  modeName: string,
  inputPath: string,
  outputDir: string,
  configPath?: string,
) {
  const logger = new ConsoleLogger();

  const components = registry.getMode(modeName);
  if (!components) {
    const available = registry.getAvailableModes().join(", ");
    logger.error(`Unknown mode: ${modeName}. Available: ${available}`);
    process.exit(1);
  }

  for (const component of [
    components.parser,
    components.processor,
    components.reporter,
  ]) {
    if (isConfigurable(component)) {
      const configResult = await loadConfig(configPath);
      if (!configResult.success) {
        logger.error(configResult.error.message);
        process.exit(1);
      }

      await component.configure(configResult.value);
    }
  }

  try {
    await access(inputPath);
  } catch {
    logger.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  await runPipeline({
    inputPath,
    outputDir,
    modeName,
    components,
    logger,
  });

  process.exit(0);
}
