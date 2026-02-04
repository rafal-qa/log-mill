import type {
  Processor,
  ParseError,
  ProcessorContext,
} from "../../core/interfaces.js";
import type { Result } from "../../core/types.js";
import { HttpAccessRecordSchema } from "../../contracts/http-access-contract.js";
import type { HttpAccessRecord } from "../../contracts/http-access-contract.js";
import type { VisitorStats } from "../../contracts/http-access-contract.js";

const PROGRESS_INTERVAL = 10_000;

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
  readonly inputSchema = HttpAccessRecordSchema;

  async process(
    records: AsyncIterable<Result<HttpAccessRecord, ParseError>>,
    context: ProcessorContext,
  ): Promise<VisitorStats> {
    let totalRequests = 0;
    let parseErrors = 0;
    let linesProcessed = 0;
    const requestsByDay = new Map<string, number>();

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
      const day = toDateKey(result.value.timestamp);
      requestsByDay.set(day, (requestsByDay.get(day) ?? 0) + 1);
    }

    context.logger.progress(linesProcessed);

    return { totalRequests, parseErrors, requestsByDay };
  }

  /**
   * Merges two VisitorStats by summing counts.
   */
  merge(existing: VisitorStats, incoming: VisitorStats): VisitorStats {
    const requestsByDay = new Map(existing.requestsByDay);
    for (const [day, count] of incoming.requestsByDay) {
      requestsByDay.set(day, (requestsByDay.get(day) ?? 0) + count);
    }

    return {
      totalRequests: existing.totalRequests + incoming.totalRequests,
      parseErrors: existing.parseErrors + incoming.parseErrors,
      requestsByDay,
    };
  }
}
