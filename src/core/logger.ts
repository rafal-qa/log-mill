export interface Logger {
  info(message: string): void;
  error(message: string): void;
  progress(linesProcessed: number): void;
  progressComplete(): void;
}

export class ConsoleLogger implements Logger {
  info(message: string): void {
    console.error(`[INFO] ${message}`);
  }

  error(message: string): void {
    console.error(`[ERROR] ${message}`);
  }

  progress(linesProcessed: number): void {
    // Use stderr so stdout remains clean for potential piping
    // \r returns cursor to line start for in-place update
    process.stderr.write(
      `\rProcessing... ${linesProcessed.toLocaleString()} lines`,
    );
  }

  progressComplete(): void {
    process.stderr.write("\n");
  }
}
