import type {
  Processor,
  ParseError,
  ParsedRecord,
  ProcessorContext,
} from "../../core/interfaces.js";
import type { Result } from "../../core/result.js";
import type { SyslogRecord } from "../../parsers/syslog-parser.js";

const PROGRESS_INTERVAL = 10_000;

export interface AppDayCount {
  app: string;
  totalEntries: number;
  byDay: Record<string, number>;
}

export interface AppActivityStats {
  totalEntries: number;
  parseErrors: number;
  countsByApp: Record<string, AppDayCount>;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class SyslogAppsProcessor
  implements Processor<SyslogRecord, AppActivityStats>
{
  async process(
    records: AsyncIterable<Result<ParsedRecord<SyslogRecord>, ParseError>>,
    context: ProcessorContext,
  ): Promise<AppActivityStats> {
    let totalEntries = 0;
    let parseErrors = 0;
    let linesProcessed = 0;
    const countsByApp: Record<string, AppDayCount> = {};

    for await (const result of records) {
      linesProcessed++;

      if (linesProcessed % PROGRESS_INTERVAL === 0) {
        context.logger.progress(linesProcessed);
      }

      if (!result.success) {
        parseErrors++;
        continue;
      }

      totalEntries++;
      const app = result.value.record.app;
      const day = toDateKey(result.value.record.timestamp);

      let appData = countsByApp[app];
      if (!appData) {
        appData = {
          app,
          totalEntries: 0,
          byDay: {},
        };
        countsByApp[app] = appData;
      }

      appData.totalEntries++;
      appData.byDay[day] = (appData.byDay[day] ?? 0) + 1;
    }

    context.logger.progress(linesProcessed);
    context.logger.progressComplete();

    return { totalEntries, parseErrors, countsByApp };
  }

  merge(
    existing: AppActivityStats,
    incoming: AppActivityStats,
  ): AppActivityStats {
    const countsByApp = { ...existing.countsByApp };

    for (const [app, incomingApp] of Object.entries(incoming.countsByApp)) {
      const existingApp = countsByApp[app];

      if (!existingApp) {
        countsByApp[app] = {
          app: incomingApp.app,
          totalEntries: incomingApp.totalEntries,
          byDay: { ...incomingApp.byDay },
        };
      } else {
        existingApp.totalEntries += incomingApp.totalEntries;
        for (const [day, count] of Object.entries(incomingApp.byDay)) {
          existingApp.byDay[day] = (existingApp.byDay[day] ?? 0) + count;
        }
      }
    }

    return {
      totalEntries: existing.totalEntries + incoming.totalEntries,
      parseErrors: existing.parseErrors + incoming.parseErrors,
      countsByApp,
    };
  }
}
