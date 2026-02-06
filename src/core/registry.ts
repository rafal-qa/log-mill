import type { Parser, Processor, Reporter } from "./interfaces.js";

export interface ModeComponents<TRecord, TResult> {
  parser: Parser<TRecord>;
  processor: Processor<TRecord, TResult>;
  reporter: Reporter<TResult>;
}

class Registry {
  private modes = new Map<string, ModeComponents<unknown, unknown>>();

  registerMode<TRecord, TResult>(
    name: string,
    components: ModeComponents<TRecord, TResult>,
  ): void {
    this.modes.set(name, components);
  }

  getMode(name: string): ModeComponents<unknown, unknown> | undefined {
    return this.modes.get(name);
  }

  getAvailableModes(): string[] {
    return Array.from(this.modes.keys());
  }
}

export const registry = new Registry();
