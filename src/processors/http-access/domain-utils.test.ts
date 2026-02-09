import { describe, it, expect } from "vitest";
import { extractDomain } from "./domain-utils.js";

describe("extractDomain - normalizes URL to domain name", () => {
  it("strips protocol and path", () => {
    expect(extractDomain("https://example.com/page")).toBe("example.com");
    expect(extractDomain("http://example.com/page")).toBe("example.com");
  });

  it("strips www prefix", () => {
    expect(extractDomain("https://www.example.com/page")).toBe("example.com");
  });

  it("preserves subdomain", () => {
    expect(extractDomain("https://blog.example.com/page")).toBe(
      "blog.example.com",
    );
  });

  it("preserves port number", () => {
    expect(extractDomain("https://example.com:8080/page")).toBe(
      "example.com:8080",
    );
  });

  it("handles domain without protocol or path", () => {
    expect(extractDomain("example.com")).toBe("example.com");
  });
});
