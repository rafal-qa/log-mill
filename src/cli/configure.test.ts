import { describe, it, expect, assert } from "vitest";
import { configure } from "./configure.js";
import type { ConfigData, Configurable } from "../core/interfaces.js";
import { join } from "node:path";

class MockConfigurableComponent implements Configurable {
  public receivedConfig: ConfigData | null = null;

  async configure(config: ConfigData): Promise<void> {
    this.receivedConfig = config;
  }
}

class MockNonConfigurableComponent {}

const CONFIG_PATH = join(
  process.cwd(),
  "src/__fixtures__/cli/test-config.yaml",
);

describe("configure - applies configuration to components", () => {
  it("configures component that implements Configurable", async () => {
    const component = new MockConfigurableComponent();

    const result = await configure(component, CONFIG_PATH);

    assert.isTrue(result.success);
    assert.isTrue(result.value);

    assert.ok(component.receivedConfig);
    expect(component.receivedConfig.value).toEqual({
      mode: "test",
      options: { enabled: true, threshold: 42 },
    });
  });

  it("skips non-configurable component", async () => {
    const component = new MockNonConfigurableComponent();

    const result = await configure(component, CONFIG_PATH);

    assert.isTrue(result.success);
    assert.isFalse(result.value);
  });

  it("returns error when config file does not exist", async () => {
    const component = new MockConfigurableComponent();

    const result = await configure(component, "/nonexistent/config.yaml");

    assert.isFalse(result.success);
    expect(result.error.message).toContain("file not found");
  });

  it("returns error when config required but path not provided", async () => {
    const component = new MockConfigurableComponent();

    const result = await configure(component, undefined);

    assert.isFalse(result.success);
    expect(result.error.message).toContain("requires configuration");
  });

  it("allows non-configurable component without config path", async () => {
    const component = new MockNonConfigurableComponent();

    const result = await configure(component, undefined);

    assert.isTrue(result.success);
    assert.isFalse(result.value);
  });
});
