import type { Parser, Processor, Reporter } from "./interfaces.js";

export interface ModeComponents {
  parser: Parser<unknown>;
  processor: Processor<unknown, unknown>;
  reporter: Reporter<unknown>;
}

class Registry {
  private modes = new Map<string, ModeComponents>();

  registerMode(name: string, components: ModeComponents): void {
    if (this.modes.has(name)) {
      throw new Error(`Mode already registered: ${name}`);
    }

    if (components.parser.recordSchema !== components.processor.inputSchema) {
      throw new Error(
        `Mode "${name}": schema mismatch between parser and processor`,
      );
    }

    this.modes.set(name, components);
  }

  getMode(name: string): ModeComponents | undefined {
    return this.modes.get(name);
  }

  getAvailableModes(): string[] {
    return Array.from(this.modes.keys());
  }
}

export const registry = new Registry();
