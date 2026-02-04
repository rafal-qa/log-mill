import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { Parser, ParseError } from "../core/interfaces.js";
import { ok, err } from "../core/types.js";
import type { Result } from "../core/types.js";
import { httpAccessCombined } from "./formats/http-log-format.js";
import { HttpAccessRecordSchema } from "../contracts/http-access-contract.js";
import type { HttpAccessRecord } from "../contracts/http-access-contract.js";

/**
 * HTTP access log parser for the Combined Log Format.
 * Streams records one line at a time via an AsyncIterable.
 */
export class HttpAccessParser implements Parser<HttpAccessRecord> {
  readonly recordSchema = HttpAccessRecordSchema;

  async *parse(
    inputPath: string,
  ): AsyncIterable<Result<HttpAccessRecord, ParseError>> {
    const stream = createReadStream(inputPath, { encoding: "utf-8" });
    const rl = createInterface({ input: stream });

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
          referer: fields.referer,
          userAgent: fields.userAgent,
        };
        yield ok(record);
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
