/**
 * Copies non-TS assets (e.g. *.ejs templates) from src/ into dist/,
 * preserving directory structure. Runs automatically as a postbuild step.
 */

import { cp, glob } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SRC = join(__dirname, "..", "src");
const DIST = join(__dirname, "..", "dist");

const PATTERNS = ["**/*.ejs"];

for (const pattern of PATTERNS) {
  for await (const relative of glob(pattern, { cwd: SRC })) {
    const src = join(SRC, relative);
    const dest = join(DIST, relative);
    await cp(src, dest);
  }
}
