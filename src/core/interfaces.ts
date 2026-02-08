import type { Result } from "./result.js";
import type { Logger } from "./logger.js";

/**
 * Describes a line that failed to parse.
 */
export interface ParseError {
  line: number;
  content: string;
  reason: string;
}

/**
 * Wraps a successfully parsed record with its original raw line text.
 * The raw line is used by the pipeline for cursor tracking (resume support).
 */
export interface ParsedRecord<TRecord> {
  record: TRecord;
  rawLine: string;
}

/**
 * Parses a log file into a stream of typed records.
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
 *
 * **IMPORTANT: TResult must be JSON-serializable**
 * - Use plain objects, arrays, strings, numbers, booleans, null
 * - Do NOT use Map, Set, Date, class instances, or functions
 * - Maps silently disappear during JSON.stringify — use Record<K, V> instead
 * - For dates, store as ISO strings and parse when needed
 */
export interface Processor<TRecord, TResult> {
  process(
    records: AsyncIterable<Result<ParsedRecord<TRecord>, ParseError>>,
    context: ProcessorContext,
  ): Promise<TResult>;

  merge(existing: TResult, incoming: TResult): TResult;
}

/**
 * Generates a report from the aggregated result produced by a Processor.
 */
export interface Reporter<TResult> {
  report(data: TResult, outputPath: string): Promise<void>;
}

/**
 * Wraps raw configuration data passed to configurable components.
 * Components receive this and validate the value against their own schema.
 */
export class ConfigData {
  constructor(public readonly value: unknown) {}
}

/**
 * Optional interface for components that require external configuration.
 */
export interface Configurable {
  configure(config: ConfigData): Promise<void>;
}

/**
 * Type guard to check if a component implements the Configurable interface.
 */
export function isConfigurable(obj: unknown): obj is Configurable {
  return typeof obj === "object" && obj !== null && "configure" in obj;
}
