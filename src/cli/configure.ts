import type { Configurable } from "../core/interfaces.js";
import { loadConfig } from "./load-config.js";
import { err, ok, type Result } from "../core/result.js";

/** Type guard to check if a component implements the Configurable interface */
function isConfigurable(obj: unknown): obj is Configurable {
  return typeof obj === "object" && obj !== null && "configure" in obj;
}

/**
 * Configures a component if it implements the Configurable interface.
 * Loads and applies configuration, mutating the component in place.
 *
 * @param component - Component to configure (mutated if Configurable)
 * @param configPath - Path to configuration file
 * @returns Result<boolean> - true if component was configured, false otherwise
 */
export async function configure(
  component: unknown,
  configPath?: string,
): Promise<Result<boolean>> {
  if (isConfigurable(component)) {
    const loadConfigResult = await loadConfig(configPath);
    if (!loadConfigResult.success) {
      return err(loadConfigResult.error);
    }

    await component.configure(loadConfigResult.value);
    return ok(true);
  }

  return ok(false);
}
