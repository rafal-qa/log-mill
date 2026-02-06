import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ejs from "ejs";
import { readFileSync } from "node:fs";
import type { Reporter } from "../../core/interfaces.js";
import type { VisitorStats } from "../../processors/http-access/processor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(__dirname, "template.ejs");

/**
 * Generates an HTML report from VisitorStats using an EJS template.
 */
export class HttpAccessHtmlReporter implements Reporter<VisitorStats> {
  async report(data: VisitorStats, outputPath: string): Promise<void> {
    const template = readFileSync(TEMPLATE_PATH, "utf-8");
    const html = ejs.render(template, { stats: data });
    await writeFile(outputPath, html, "utf-8");
  }
}
