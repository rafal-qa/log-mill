import { assert, describe, expect, it } from "vitest";
import { httpAccessCombined } from "./http-log-format.js";

describe("httpAccessCombined - parses Apache combined log format", () => {
  it("extracts all fields from valid combined format line", () => {
    const line =
      '192.168.1.10 - frank [10/Oct/2023:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326 "http://example.com" "Mozilla/5.0 (compatible)"';
    const match = line.match(httpAccessCombined.pattern);
    assert.ok(match);

    expect(httpAccessCombined.transform(match)).toEqual({
      ip: "192.168.1.10",
      timestamp: new Date("2023-10-10T13:55:36+00:00"),
      method: "GET",
      path: "/index.html",
      protocol: "HTTP/1.1",
      status: "200",
      size: "2326",
      referrer: "http://example.com",
      userAgent: "Mozilla/5.0 (compatible)",
    });
  });

  it("parses size as '-' when response body is empty", () => {
    const line =
      '10.0.0.1 - - [01/Jan/2024:00:00:00 +0000] "HEAD /ping HTTP/1.1" 204 - "http://example.com" "curl/8.0"';
    const match = line.match(httpAccessCombined.pattern);
    assert.ok(match);

    expect(httpAccessCombined.transform(match).size).toBe("-");
  });

  it("parses empty referer and user agent as empty strings", () => {
    const line =
      '10.0.0.1 - - [01/Jan/2024:00:00:00 +0000] "GET / HTTP/1.1" 200 512 "" ""';
    const match = line.match(httpAccessCombined.pattern);
    assert.ok(match);

    const result = httpAccessCombined.transform(match);

    expect(result.referrer).toBe("");
    expect(result.userAgent).toBe("");
  });

  it("parses timestamp with positive timezone offset", () => {
    const line =
      '10.0.0.1 - - [15/Jun/2023:08:30:00 +0530] "GET /api HTTP/1.1" 200 100 "" ""';
    const match = line.match(httpAccessCombined.pattern);
    assert.ok(match);

    expect(httpAccessCombined.transform(match).timestamp).toEqual(
      new Date("2023-06-15T08:30:00+05:30"),
    );
  });

  it("rejects common format line (missing referer and user agent)", () => {
    const line =
      '192.168.1.10 - - [10/Oct/2023:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326';
    const match = line.match(httpAccessCombined.pattern);
    assert.isNull(match);
  });

  it("throws on invalid month in timestamp", () => {
    const line =
      '10.0.0.1 - - [01/Xyz/2024:00:00:00 +0000] "GET / HTTP/1.1" 200 100 "" ""';
    const match = line.match(httpAccessCombined.pattern);
    assert.ok(match);

    expect(() => httpAccessCombined.transform(match)).toThrow(
      "Unknown month: Xyz",
    );
  });
});
