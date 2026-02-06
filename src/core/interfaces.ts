import type { Result } from "./result.js";
import type { Logger } from "./logger.js";

export interface ParseError {
  line: number;
  content: string;
  reason: string;
}

/**
 * Wraps a successfully parsed record with its original raw line text.
 * The raw line is used by the pipeline for cursor tracking (resume support)
 * without requiring domain schemas to know about persistence.
 */
export interface ParsedRecord<TRecord> {
  record: TRecord;
  rawLine: string;
}

/**
 * Parses a log file into a stream of typed records.
 * `recordSchema` describes the output shape and is used by the registry
 * to validate compatibility with the downstream processor at registration time.
 */
export interface Parser<TRecord> {
  parse(
    inputPath: string,
  ): AsyncIterable<Result<ParsedRecord<TRecord>, ParseError>>;
}

export interface ProcessorContext {
  logger: Logger;
}

/**
 * Processes a stream of parsed records into an aggregated result.
 * `inputSchema` describes the expected input shape and is used by the registry
 * to validate compatibility with the upstream parser at registration time.
 */
export interface Processor<TRecord, TResult> {
  process(
    records: AsyncIterable<Result<ParsedRecord<TRecord>, ParseError>>,
    context: ProcessorContext,
  ): Promise<TResult>;
  merge(existing: TResult, incoming: TResult): TResult;
}

/**
 * Generates a report from processed data and writes it to a file.
 */
export interface Reporter<TResult> {
  report(data: TResult, outputPath: string): Promise<void>;
}
