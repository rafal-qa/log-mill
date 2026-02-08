import { err, ok, type Result } from "../core/result.js";
import { ConfigData } from "../core/interfaces.js";
import { access, readFile } from "node:fs/promises";
import { parse } from "yaml";

export async function loadConfig(
  path: string | undefined,
): Promise<Result<ConfigData>> {
  if (!path) {
    return err(
      new Error("This mode requires configuration file but was not provided"),
    );
  }

  try {
    await access(path);
  } catch {
    return err(new Error(`Configuration file not found: ${path}`));
  }

  const content = await readFile(path, "utf-8");
  return ok(new ConfigData(parse(content)));
}
