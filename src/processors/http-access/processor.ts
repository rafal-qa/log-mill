import type {
  Processor,
  ParseError,
  ParsedRecord,
  ProcessorContext,
} from "../../core/interfaces.js";
import type { Result } from "../../core/result.js";
import type { HttpAccessRecord } from "../../parsers/http-access-parser.js";

const PROGRESS_INTERVAL = 10_000;

export interface VisitorStats {
  totalRequests: number;
  parseErrors: number;
  requestsByDay: Record<string, number>;
}

/**
 * Formats a Date as YYYY-MM-DD in UTC.
 */
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Aggregates HTTP access records into per-day request counts.
 */
export class HttpAccessProcessor
  implements Processor<HttpAccessRecord, VisitorStats>
{
  async process(
    records: AsyncIterable<Result<ParsedRecord<HttpAccessRecord>, ParseError>>,
    context: ProcessorContext,
  ): Promise<VisitorStats> {
    let totalRequests = 0;
    let parseErrors = 0;
    let linesProcessed = 0;
    const requestsByDay: Record<string, number> = {};

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
    }

    context.logger.progress(linesProcessed);

    return { totalRequests, parseErrors, requestsByDay };
  }

  /**
   * Merges two VisitorStats by summing counts.
   */
  merge(existing: VisitorStats, incoming: VisitorStats): VisitorStats {
    const requestsByDay = { ...existing.requestsByDay };
    for (const [day, count] of Object.entries(incoming.requestsByDay)) {
      requestsByDay[day] = (requestsByDay[day] ?? 0) + count;
    }

    return {
      totalRequests: existing.totalRequests + incoming.totalRequests,
      parseErrors: existing.parseErrors + incoming.parseErrors,
      requestsByDay,
    };
  }
}
