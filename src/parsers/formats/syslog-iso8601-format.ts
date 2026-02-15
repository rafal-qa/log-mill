import type { LogFormat } from "./log-format.js";

interface SyslogIso8601Fields {
  timestamp: Date;
  host: string;
  app: string;
  pid: number | null;
  message: string;
}

/**
 * Syslog format with ISO 8601 timestamp.
 *
 * A modern syslog variant similar to RFC 5424, but without PRI and
 * structured data fields. Common on systemd-based Linux distributions
 * (e.g. Debian, Ubuntu, RHEL) in /var/log/syslog or /var/log/messages.
 */
export const syslogIso8601: LogFormat<SyslogIso8601Fields> = {
  pattern: /^([0-9T:.+-]+)\s+(\S+)\s+([^\s[:]+)(?:\[(\d+)])?:\s+(.*)$/,
  transform: (match) => ({
    timestamp: new Date(match[1] as string),
    host: match[2] as string,
    app: match[3] as string,
    pid: match[4] ? Number(match[4]) : null,
    message: match[5] as string,
  }),
};
