import { describe, it, expect } from "vitest";
import type { HttpAccessRecord } from "../../parsers/http-access-parser.js";
import type {
  ParseError,
  ParsedRecord,
  ProcessorContext,
} from "../../core/interfaces.js";
import type { Result } from "../../core/result.js";
import { ok, err } from "../../core/result.js";
import { HttpAccessProcessor } from "./processor.js";
import { ConfigData } from "../../core/interfaces.js";

function createMockContext(): ProcessorContext {
  return {
    logger: {
      info: () => {},
      error: () => {},
      progress: () => {},
      progressComplete: () => {},
    },
  };
}

async function* createStream(
  records: Array<Result<ParsedRecord<HttpAccessRecord>, ParseError>>,
): AsyncIterable<Result<ParsedRecord<HttpAccessRecord>, ParseError>> {
  for (const record of records) {
    yield record;
  }
}

function createRecord(
  timestamp: string,
  referrer: string = "-",
): Result<ParsedRecord<HttpAccessRecord>, ParseError> {
  return ok({
    record: {
      ip: "192.168.1.1",
      timestamp: new Date(timestamp),
      method: "GET",
      path: "/",
      protocol: "HTTP/1.1",
      status: "200",
      size: "1234",
      referrer,
      userAgent: "Mozilla/5.0",
    },
    rawLine: "log line",
  }) as Result<ParsedRecord<HttpAccessRecord>, ParseError>;
}

describe("process - aggregates log records into statistics", () => {
  it("counts total requests, parse errors, and groups by day", async () => {
    const processor = new HttpAccessProcessor();
    await processor.configure(new ConfigData({ excludePatterns: [] }));

    const records = [
      createRecord("2024-01-01T10:00:00Z"),
      createRecord("2024-01-01T14:00:00Z"),
      createRecord("2024-01-02T10:00:00Z"),
      err({ line: 4, content: "malformed", reason: "parse failed" }),
      createRecord("2024-01-03T10:00:00Z"),
    ];

    const result = await processor.process(
      createStream(records),
      createMockContext(),
    );

    expect(result.totalRequests).toBe(4);
    expect(result.parseErrors).toBe(1);
    expect(result.requestsByDay).toEqual({
      "2024-01-01": 2,
      "2024-01-02": 1,
      "2024-01-03": 1,
    });
  });

  it("tracks external referrers with domain and URL counts", async () => {
    const processor = new HttpAccessProcessor();
    await processor.configure(
      new ConfigData({
        excludePatterns: ["^https?://example\\.com"],
      }),
    );

    const records = [
      createRecord("2024-01-01T10:00:00Z", "http://google.com/search"),
      createRecord("2024-01-01T11:00:00Z", "http://google.com/search"),
      createRecord("2024-01-01T12:00:00Z", "http://google.com/ads"),
      createRecord("2024-01-01T13:00:00Z", "http://reddit.com/r/programming"),
      createRecord("2024-01-01T14:00:00Z", "http://reddit.com/r/programming"),
    ];

    const result = await processor.process(
      createStream(records),
      createMockContext(),
    );

    expect(result.referrers).toEqual({
      "google.com": {
        domain: "google.com",
        totalVisits: 3,
        urls: {
          "http://google.com/search": 2,
          "http://google.com/ads": 1,
        },
      },
      "reddit.com": {
        domain: "reddit.com",
        totalVisits: 2,
        urls: {
          "http://reddit.com/r/programming": 2,
        },
      },
    });
  });

  it("excludes internal referrers matching configured patterns", async () => {
    const processor = new HttpAccessProcessor();
    await processor.configure(
      new ConfigData({
        excludePatterns: [
          "^https?://example\\.com",
          "^https?://www\\.example\\.com",
        ],
      }),
    );

    const records = [
      createRecord("2024-01-01T10:00:00Z", "http://example.com/page1"),
      createRecord("2024-01-01T11:00:00Z", "http://www.example.com/page2"),
      createRecord("2024-01-01T12:00:00Z", "http://google.com/search"),
      createRecord("2024-01-01T13:00:00Z", "-"),
      createRecord("2024-01-01T14:00:00Z", ""),
    ];

    const result = await processor.process(
      createStream(records),
      createMockContext(),
    );

    expect(result.referrers).toEqual({
      "google.com": {
        domain: "google.com",
        totalVisits: 1,
        urls: {
          "http://google.com/search": 1,
        },
      },
    });
    expect(result.totalRequests).toBe(5);
  });
});
