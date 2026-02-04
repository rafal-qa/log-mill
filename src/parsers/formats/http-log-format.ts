import type { LogFormat } from "./log-format.js";

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

/**
 * Parses a CLF/Combined timestamp string (e.g. "10/Oct/2023:13:55:36 +0000")
 * into a Date. Throws if the format is unrecognised.
 */
function parseTimestamp(raw: string): Date {
  const match = raw.match(
    /^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/,
  );
  if (!match) {
    throw new Error(`Unrecognised timestamp: ${raw}`);
  }

  // All 7 capture groups are guaranteed by the regex above
  const [, day, monthStr, year, hh, mm, ss, tz] = match as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];

  const month = MONTHS[monthStr];
  if (month === undefined) {
    throw new Error(`Unknown month: ${monthStr}`);
  }

  // tz is +HHMM; insert colon for ISO format → +HH:MM
  const tzFormatted = `${tz.slice(0, 3)}:${tz.slice(3)}`;
  const iso = `${year}-${String(month + 1).padStart(2, "0")}-${day}T${hh}:${mm}:${ss}${tzFormatted}`;

  return new Date(iso);
}

interface HttpAccessCombinedFields {
  ip: string;
  timestamp: Date;
  method: string;
  path: string;
  protocol: string;
  status: string;
  size: string;
  referer: string;
  userAgent: string;
}

// Combined Log Format:
// 127.0.0.1 - - [10/Oct/2023:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326 "http://example.com" "Mozilla/5.0..."
export const httpAccessCombined: LogFormat<HttpAccessCombinedFields> = {
  pattern:
    /^(\S+) \S+ \S+ \[([^\]]+)] "(\S+) (\S+) (\S+)" (\d+) (\d+|-) "([^"]*)" "([^"]*)"$/,
  transform: (match) => ({
    ip: match[1] as string,
    timestamp: parseTimestamp(match[2] as string),
    method: match[3] as string,
    path: match[4] as string,
    protocol: match[5] as string,
    status: match[6] as string,
    size: match[7] as string,
    referer: match[8] as string,
    userAgent: match[9] as string,
  }),
};

interface HttpAccessCommonFields {
  ip: string;
  timestamp: Date;
  method: string;
  path: string;
  protocol: string;
  status: string;
  size: string;
}

// Common Log Format:
// 127.0.0.1 - - [10/Oct/2023:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326
export const httpAccessCommon: LogFormat<HttpAccessCommonFields> = {
  pattern: /^(\S+) \S+ \S+ \[([^\]]+)] "(\S+) (\S+) (\S+)" (\d+) (\d+|-)$/,
  transform: (match) => ({
    ip: match[1] as string,
    timestamp: parseTimestamp(match[2] as string),
    method: match[3] as string,
    path: match[4] as string,
    protocol: match[5] as string,
    status: match[6] as string,
    size: match[7] as string,
  }),
};
