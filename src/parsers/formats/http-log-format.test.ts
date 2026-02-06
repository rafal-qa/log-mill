import { describe, expect, it } from "vitest";

import { httpAccessCombined, httpAccessCommon } from "./http-log-format.js";
import type { LogFormat } from "./log-format.js";

/**
 * Runs a log line through a LogFormat's pattern and transform in the same way
 * the pipeline does: match first, then extract fields.
 */
function parse<T>(format: LogFormat<T>, line: string): T | null {
  const match = line.match(format.pattern);
  if (!match) return null;
  return format.transform(match);
}

describe("httpAccessCombined - parses Apache combined log format", () => {
  it("extracts all fields from valid combined format line", () => {
    const line =
      '192.168.1.10 - frank [10/Oct/2023:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326 "http://example.com" "Mozilla/5.0 (compatible)"';
    const result = parse(httpAccessCombined, line);

    expect(result).toEqual({
      ip: "192.168.1.10",
      timestamp: new Date("2023-10-10T13:55:36+00:00"),
      method: "GET",
      path: "/index.html",
      protocol: "HTTP/1.1",
      status: "200",
      size: "2326",
      referer: "http://example.com",
      userAgent: "Mozilla/5.0 (compatible)",
    });
  });

  it("parses size as '-' when response body is empty", () => {
    const line =
      '10.0.0.1 - - [01/Jan/2024:00:00:00 +0000] "HEAD /ping HTTP/1.1" 204 - "http://example.com" "curl/8.0"';
    const result = parse(httpAccessCombined, line);

    expect(result?.size).toBe("-");
  });

  it("parses empty referer and user agent as empty strings", () => {
    const line =
      '10.0.0.1 - - [01/Jan/2024:00:00:00 +0000] "GET / HTTP/1.1" 200 512 "" ""';
    const result = parse(httpAccessCombined, line);

    expect(result?.referer).toBe("");
    expect(result?.userAgent).toBe("");
  });

  it("parses timestamp with positive timezone offset", () => {
    const line =
      '10.0.0.1 - - [15/Jun/2023:08:30:00 +0530] "GET /api HTTP/1.1" 200 100 "" ""';
    const result = parse(httpAccessCombined, line);

    expect(result?.timestamp).toEqual(new Date("2023-06-15T08:30:00+05:30"));
  });

  it("rejects common format line (missing referer and user agent)", () => {
    const commonLine =
      '192.168.1.10 - - [10/Oct/2023:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326';
    const result = parse(httpAccessCombined, commonLine);

    expect(result).toBeNull();
  });

  it("throws on invalid month in timestamp", () => {
    const line =
      '10.0.0.1 - - [01/Xyz/2024:00:00:00 +0000] "GET / HTTP/1.1" 200 100 "" ""';
    const match = line.match(httpAccessCombined.pattern);

    if (!match) throw new Error("expected pattern to match");
    expect(() => httpAccessCombined.transform(match)).toThrow(
      "Unknown month: Xyz",
    );
  });
});

describe("httpAccessCommon - parses Apache common log format", () => {
  it("extracts all fields from valid common format line", () => {
    const line =
      '192.168.1.10 - frank [10/Oct/2023:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326';
    const result = parse(httpAccessCommon, line);

    expect(result).toEqual({
      ip: "192.168.1.10",
      timestamp: new Date("2023-10-10T13:55:36+00:00"),
      method: "GET",
      path: "/index.html",
      protocol: "HTTP/1.1",
      status: "200",
      size: "2326",
    });
  });

  it("parses size as '-' when response body is empty", () => {
    const line =
      '10.0.0.1 - - [01/Jan/2024:00:00:00 +0000] "HEAD /ping HTTP/1.1" 204 -';
    const result = parse(httpAccessCommon, line);

    expect(result?.size).toBe("-");
  });

  it("parses timestamp with negative timezone offset", () => {
    const line =
      '10.0.0.1 - - [25/Dec/2023:23:59:59 -0800] "GET /page HTTP/1.1" 301 0';
    const result = parse(httpAccessCommon, line);

    expect(result?.timestamp).toEqual(new Date("2023-12-25T23:59:59-08:00"));
  });

  it("rejects combined format line (extra fields present)", () => {
    const combinedLine =
      '192.168.1.10 - - [10/Oct/2023:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326 "http://example.com" "Mozilla/5.0"';
    const result = parse(httpAccessCommon, combinedLine);

    expect(result).toBeNull();
  });

  it("throws on invalid month in timestamp", () => {
    const line =
      '10.0.0.1 - - [01/Abc/2024:00:00:00 +0000] "GET / HTTP/1.1" 200 100';
    const match = line.match(httpAccessCommon.pattern);

    if (!match) throw new Error("expected pattern to match");
    expect(() => httpAccessCommon.transform(match)).toThrow(
      "Unknown month: Abc",
    );
  });
});
