import { describe, it, expect } from "vitest";
import type { VisitorStats } from "./processor.js";
import { HttpAccessProcessor } from "./processor.js";

describe("merge - combines existing and new statistics", () => {
  it("sums counters and merges day counts", () => {
    const processor = new HttpAccessProcessor();

    const existing: VisitorStats = {
      totalRequests: 100,
      parseErrors: 5,
      requestsByDay: {
        "2024-01-01": 50,
        "2024-01-02": 50,
      },
      referrers: {},
    };

    const incoming: VisitorStats = {
      totalRequests: 80,
      parseErrors: 2,
      requestsByDay: {
        "2024-01-02": 30,
        "2024-01-03": 50,
      },
      referrers: {},
    };

    const result = processor.merge(existing, incoming);

    expect(result.totalRequests).toBe(180);
    expect(result.parseErrors).toBe(7);
    expect(result.requestsByDay).toEqual({
      "2024-01-01": 50,
      "2024-01-02": 80,
      "2024-01-03": 50,
    });
  });

  it("merges referrers adding new domains and updating existing ones", () => {
    const processor = new HttpAccessProcessor();

    const existing: VisitorStats = {
      totalRequests: 100,
      parseErrors: 0,
      requestsByDay: {},
      referrers: {
        "example.com": {
          domain: "example.com",
          totalVisits: 10,
          urls: {
            "http://example.com/page1": 5,
            "http://example.com/page2": 5,
          },
        },
      },
    };

    const incoming: VisitorStats = {
      totalRequests: 50,
      parseErrors: 0,
      requestsByDay: {},
      referrers: {
        "example.com": {
          domain: "example.com",
          totalVisits: 8,
          urls: {
            "http://example.com/page2": 3,
            "http://example.com/page3": 5,
          },
        },
        "other.com": {
          domain: "other.com",
          totalVisits: 3,
          urls: {
            "http://other.com/page": 2,
          },
        },
      },
    };

    const result = processor.merge(existing, incoming);

    expect(result.referrers).toEqual({
      "example.com": {
        domain: "example.com",
        totalVisits: 18,
        urls: {
          "http://example.com/page1": 5,
          "http://example.com/page2": 8,
          "http://example.com/page3": 5,
        },
      },
      "other.com": {
        domain: "other.com",
        totalVisits: 3,
        urls: {
          "http://other.com/page": 2,
        },
      },
    });
  });
});
