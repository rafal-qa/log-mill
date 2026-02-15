import type { Parser, ParseError, ParsedRecord } from "../core/interfaces.js";
import { ok, err } from "../core/result.js";
import type { Result } from "../core/result.js";
import { syslogIso8601 } from "./formats/syslog-iso8601-format.js";
import { readLines } from "../core/read-lines.js";

export interface SyslogRecord {
  timestamp: Date;
  host: string;
  app: string;
  pid: number | null;
  message: string;
}

/**
 * Syslog parser with ISO8601 timestamp format.
 * Format: "TIMESTAMP HOST APP[PID]: MESSAGE"
 * Streams records one line at a time via an AsyncIterable.
 */
export class SyslogParser implements Parser<SyslogRecord> {
  async *parse(
    inputPath: string,
  ): AsyncIterable<Result<ParsedRecord<SyslogRecord>, ParseError>> {
    const rl = readLines(inputPath);

    let lineNumber = 0;

    for await (const line of rl) {
      lineNumber++;

      if (line.trim() === "") {
        continue;
      }

      const match = line.match(syslogIso8601.pattern);
      if (!match) {
        yield err<ParseError>({
          line: lineNumber,
          content: line,
          reason: "Line does not match syslog format",
        });
        continue;
      }

      try {
        const fields = syslogIso8601.transform(match);
        const record: SyslogRecord = {
          timestamp: fields.timestamp,
          host: fields.host,
          app: fields.app,
          pid: fields.pid,
          message: fields.message,
        };
        yield ok<ParsedRecord<SyslogRecord>>({ record, rawLine: line });
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
