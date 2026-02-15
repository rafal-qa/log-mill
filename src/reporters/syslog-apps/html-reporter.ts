import { writeFile, mkdir, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ejs from "ejs";
import { readFileSync } from "node:fs";
import type { Reporter } from "../../core/interfaces.js";
import type { AppActivityStats } from "../../processors/syslog-apps/processor.js";
import {
  getAllDatesInRange,
  getDateRange,
  prepareChartData,
} from "./chart-data-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(__dirname, "template.ejs");
const ASSETS_DIR = join(__dirname, "assets");

export class SyslogAppsHtmlReporter implements Reporter<AppActivityStats> {
  async report(data: AppActivityStats, reportsDir: string): Promise<void> {
    const dateRange = getDateRange(data);
    const allDates = getAllDatesInRange(dateRange.minDate, dateRange.maxDate);
    const charts = prepareChartData(data, allDates);

    const template = readFileSync(TEMPLATE_PATH, "utf-8");
    const html = ejs.render(template, {
      stats: data,
      dateRange,
      charts,
    });

    await writeFile(join(reportsDir, "index.html"), html, "utf-8");

    const assetsOutputDir = join(reportsDir, "assets");
    await mkdir(assetsOutputDir, { recursive: true });

    await copyFile(
      join(ASSETS_DIR, "chart.umd.min.js"),
      join(assetsOutputDir, "chart.umd.min.js"),
    );
  }
}
