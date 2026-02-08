import type { Parser, ParseError, ParsedRecord } from "../core/interfaces.js";
import { ok, err } from "../core/result.js";
import type { Result } from "../core/result.js";
import { httpAccessCombined } from "./formats/http-log-format.js";
import { readLines } from "../core/read-lines.js";

export interface HttpAccessRecord {
  ip: string;
  timestamp: Date;
  method: string;
  path: string;
  protocol: string;
  status: number;
  size: number;
  referrer: string | null;
  userAgent: string | null;
}

/**
 * HTTP access log parser for the Combined Log Format.
 * Streams records one line at a time via an AsyncIterable.
 */
export class HttpAccessParser implements Parser<HttpAccessRecord> {
  async *parse(
    inputPath: string,
  ): AsyncIterable<Result<ParsedRecord<HttpAccessRecord>, ParseError>> {
    const rl = readLines(inputPath);

    let lineNumber = 0;

    for await (const line of rl) {
      lineNumber++;

      if (line.trim() === "") {
        continue;
      }

      const match = line.match(httpAccessCombined.pattern);
      if (!match) {
        yield err<ParseError>({
          line: lineNumber,
          content: line,
          reason: "Line does not match combined log format",
        });
        continue;
      }

      try {
        const fields = httpAccessCombined.transform(match);
        const record: HttpAccessRecord = {
          ip: fields.ip,
          timestamp: fields.timestamp,
          method: fields.method,
          path: fields.path,
          protocol: fields.protocol,
          status: Number(fields.status),
          size: fields.size === "-" ? 0 : Number(fields.size),
          referrer: fields.referrer,
          userAgent: fields.userAgent,
        };
        yield ok<ParsedRecord<HttpAccessRecord>>({ record, rawLine: line });
      } catch (e) {
        yield err<ParseError>({
          line: lineNumber,
          content: line,
          reason: e instanceof Error ? e.message : "Unknown parse error",
        });
      }
    }
  }
}
