import { describe, expect, it, assert } from "vitest";
import { syslogIso8601 } from "./syslog-iso8601-format.js";

describe("syslogIso8601 - parses syslog with ISO8601 timestamp", () => {
  it("extracts all fields from line with PID", () => {
    const line =
      "2026-01-15T10:30:45.123456+00:00 server01 sshd[8421]: Connection accepted";
    const match = line.match(syslogIso8601.pattern);
    assert.ok(match);

    expect(syslogIso8601.transform(match)).toEqual({
      timestamp: new Date("2026-01-15T10:30:45.123456+00:00"),
      host: "server01",
      app: "sshd",
      pid: 8421,
      message: "Connection accepted",
    });
  });

  it("extracts all fields from line without PID", () => {
    const line =
      "2026-01-15T10:30:45.123456+00:00 server01 kernel: System starting";
    const match = line.match(syslogIso8601.pattern);
    assert.ok(match);

    expect(syslogIso8601.transform(match)).toEqual({
      timestamp: new Date("2026-01-15T10:30:45.123456+00:00"),
      host: "server01",
      app: "kernel",
      pid: null,
      message: "System starting",
    });
  });

  it("extracts all fields from line with message containing colons", () => {
    const line =
      '2026-01-15T10:30:45.123456+00:00 server01 kernel: audit: type=1400 audit(123.1:586): apparmor="DENIED"';
    const match = line.match(syslogIso8601.pattern);
    assert.ok(match);

    expect(syslogIso8601.transform(match)).toEqual({
      timestamp: new Date("2026-01-15T10:30:45.123456+00:00"),
      host: "server01",
      app: "kernel",
      pid: null,
      message: 'audit: type=1400 audit(123.1:586): apparmor="DENIED"',
    });
  });

  it("parses timestamp with negative timezone offset", () => {
    const line =
      "2026-01-15T10:30:45.123456-05:00 server01 app[100]: Test message";
    const match = line.match(syslogIso8601.pattern);
    assert.ok(match);

    expect(syslogIso8601.transform(match).timestamp).toEqual(
      new Date("2026-01-15T10:30:45.123456-05:00"),
    );
  });

  it("rejects line without colon separator", () => {
    const line = "2026-01-15T10:30:45+00:00 server01 app[123] missing colon";
    const match = line.match(syslogIso8601.pattern);
    assert.isNull(match);
  });

  it("rejects line with corrupted timestamp", () => {
    const line =
      "\x00\x00\x002026-01-15T10:30:45.123456+00:00 server01 sshd[8421]: Connection accepted";
    const match = line.match(syslogIso8601.pattern);
    assert.isNull(match);
  });

  it("rejects line with invalid format", () => {
    const line = "not-a-valid-syslog-line";
    const match = line.match(syslogIso8601.pattern);
    assert.isNull(match);
  });
});
