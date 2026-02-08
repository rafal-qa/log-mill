import type {
  Processor,
  ParseError,
  ParsedRecord,
  ProcessorContext,
  Configurable,
  ConfigData,
} from "../../core/interfaces.js";
import type { Result } from "../../core/result.js";
import type { HttpAccessRecord } from "../../parsers/http-access-parser.js";
import { z } from "zod";

const PROGRESS_INTERVAL = 10_000;

export interface VisitorStats {
  totalRequests: number;
  parseErrors: number;
  requestsByDay: Record<string, number>;
  referrers: string[];
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class HttpAccessProcessor
  implements Processor<HttpAccessRecord, VisitorStats>, Configurable
{
  private excludeRegexes: RegExp[] = [];

  async configure(config: ConfigData): Promise<void> {
    const schema = z.object({
      domain: z.string(),
      excludePatterns: z.array(z.string()),
    });
    const validated = schema.parse(config.value);
    this.excludeRegexes = validated.excludePatterns.map(
      (pattern) => new RegExp(pattern),
    );
  }

  private isInternalReferrer(referrer: string): boolean {
    return this.excludeRegexes.some((regex) => regex.test(referrer));
  }

  async process(
    records: AsyncIterable<Result<ParsedRecord<HttpAccessRecord>, ParseError>>,
    context: ProcessorContext,
  ): Promise<VisitorStats> {
    let totalRequests = 0;
    let parseErrors = 0;
    let linesProcessed = 0;
    const requestsByDay: Record<string, number> = {};
    const referrers: string[] = [];

    for await (const result of records) {
      linesProcessed++;

      if (linesProcessed % PROGRESS_INTERVAL === 0) {
        context.logger.progress(linesProcessed);
      }

      if (!result.success) {
        parseErrors++;
        continue;
      }

      totalRequests++;
      const day = toDateKey(result.value.record.timestamp);
      requestsByDay[day] = (requestsByDay[day] ?? 0) + 1;

      // Track external referrers (skip empty and internal)
      const referrer = result.value.record.referrer;
      if (referrer && referrer !== "-" && !this.isInternalReferrer(referrer)) {
        referrers.push(referrer);
      }
    }

    context.logger.progress(linesProcessed);

    return { totalRequests, parseErrors, requestsByDay, referrers };
  }

  merge(existing: VisitorStats, incoming: VisitorStats): VisitorStats {
    const requestsByDay = { ...existing.requestsByDay };
    for (const [day, count] of Object.entries(incoming.requestsByDay)) {
      requestsByDay[day] = (requestsByDay[day] ?? 0) + count;
    }

    return {
      totalRequests: existing.totalRequests + incoming.totalRequests,
      parseErrors: existing.parseErrors + incoming.parseErrors,
      requestsByDay,
      referrers: [...existing.referrers, ...incoming.referrers],
    };
  }
}
