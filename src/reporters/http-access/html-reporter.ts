import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ejs from "ejs";
import { readFileSync } from "node:fs";
import { z } from "zod";
import type {
  Reporter,
  Configurable,
  ConfigData,
} from "../../core/interfaces.js";
import type { VisitorStats } from "../../processors/http-access/processor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(__dirname, "template.ejs");

export class HttpAccessHtmlReporter
  implements Reporter<VisitorStats>, Configurable
{
  private domain = "";

  async configure(config: ConfigData): Promise<void> {
    const schema = z.object({
      domain: z.string(),
    });
    const validated = schema.parse(config.value);
    this.domain = validated.domain;
  }

  async report(data: VisitorStats, outputPath: string): Promise<void> {
    const template = readFileSync(TEMPLATE_PATH, "utf-8");
    const html = ejs.render(template, { stats: data, domain: this.domain });
    await writeFile(outputPath, html, "utf-8");
  }
}
