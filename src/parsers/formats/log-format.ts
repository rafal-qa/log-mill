/**
 * A log format defines how to extract structured fields from a raw log line.
 * TFields is the shape of the extracted data — each format defines its own.
 */
export interface LogFormat<TFields> {
  pattern: RegExp;
  transform: (match: RegExpMatchArray) => TFields;
}
