/**
 * Tracks the position in a log file for resume support.
 * `linesProcessed` is the 1-based line number of the last line seen.
 * `lastLine` is the raw text of that line, used to verify the file hasn't changed.
 */
export interface FileCursor {
  linesProcessed: number;
  lastLine: string;
}
