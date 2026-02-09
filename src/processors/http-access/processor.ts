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
import { extractDomain } from "./domain-utils.js";

const PROGRESS_INTERVAL = 10_000;

interface ReferrerDomain {
  domain: string;
  totalVisits: number;
  urls: Map<string, number>;
}

export interface VisitorStats {
  totalRequests: number;
  parseErrors: number;
  requestsByDay: Map<string, number>;
  referrers: Map<string, ReferrerDomain>;
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
    const requestsByDay = new Map<string, number>();
    const referrers = new Map<string, ReferrerDomain>();

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
      requestsByDay.set(day, (requestsByDay.get(day) ?? 0) + 1);

      // Track external referrers (skip empty and internal)
      const referrer = result.value.record.referrer;
      if (referrer && referrer !== "-" && !this.isInternalReferrer(referrer)) {
        const domain = extractDomain(referrer);

        let domainData = referrers.get(domain);
        if (!domainData) {
          domainData = {
            domain,
            totalVisits: 0,
            urls: new Map(),
          };
          referrers.set(domain, domainData);
        }

        domainData.totalVisits++;
        domainData.urls.set(referrer, (domainData.urls.get(referrer) ?? 0) + 1);
      }
    }

    context.logger.progress(linesProcessed);
    console.error(""); // Final newline after progress output

    return { totalRequests, parseErrors, requestsByDay, referrers };
  }

  merge(existing: VisitorStats, incoming: VisitorStats): VisitorStats {
    const requestsByDay = new Map(existing.requestsByDay);
    for (const [day, count] of incoming.requestsByDay) {
      requestsByDay.set(day, (requestsByDay.get(day) ?? 0) + count);
    }

    const referrers = new Map(existing.referrers);
    for (const [domain, incomingDomain] of incoming.referrers) {
      const existingDomain = referrers.get(domain);

      if (!existingDomain) {
        referrers.set(domain, {
          domain: incomingDomain.domain,
          totalVisits: incomingDomain.totalVisits,
          urls: new Map(incomingDomain.urls),
        });
      } else {
        existingDomain.totalVisits += incomingDomain.totalVisits;
        for (const [url, count] of incomingDomain.urls) {
          existingDomain.urls.set(
            url,
            (existingDomain.urls.get(url) ?? 0) + count,
          );
        }
      }
    }

    return {
      totalRequests: existing.totalRequests + incoming.totalRequests,
      parseErrors: existing.parseErrors + incoming.parseErrors,
      requestsByDay,
      referrers,
    };
  }
}
