import { describe, expect, it, assert } from "vitest";
import {
  getDateRange,
  getAllDatesInRange,
  prepareChartData,
} from "./chart-data-utils.js";
import type { AppActivityStats } from "../../processors/syslog-apps/processor.js";

describe("getDateRange - extracts min and max dates from stats", () => {
  it("returns earliest and latest dates across multiple apps", () => {
    const stats: AppActivityStats = {
      totalEntries: 150,
      parseErrors: 0,
      countsByApp: {
        sshd: {
          app: "sshd",
          totalEntries: 100,
          byDay: {
            "2026-01-15": 50,
            "2026-01-17": 50,
          },
        },
        kernel: {
          app: "kernel",
          totalEntries: 50,
          byDay: {
            "2026-01-14": 25,
            "2026-01-16": 25,
          },
        },
      },
    };

    expect(getDateRange(stats)).toEqual({
      minDate: "2026-01-14",
      maxDate: "2026-01-17",
    });
  });

  it("returns same date when only one date exists", () => {
    const stats: AppActivityStats = {
      totalEntries: 10,
      parseErrors: 0,
      countsByApp: {
        app1: {
          app: "app1",
          totalEntries: 10,
          byDay: {
            "2026-01-15": 10,
          },
        },
      },
    };

    expect(getDateRange(stats)).toEqual({
      minDate: "2026-01-15",
      maxDate: "2026-01-15",
    });
  });

  it("throws error when no apps have data", () => {
    const stats: AppActivityStats = {
      totalEntries: 0,
      parseErrors: 0,
      countsByApp: {},
    };

    expect(() => getDateRange(stats)).toThrow("No dates found in stats");
  });
});

describe("getAllDatesInRange - generates all dates between start and end", () => {
  it("generates all dates for multi-day range", () => {
    const result = getAllDatesInRange("2026-01-15", "2026-01-18");

    expect(result).toEqual([
      "2026-01-15",
      "2026-01-16",
      "2026-01-17",
      "2026-01-18",
    ]);
  });

  it("returns single date when start equals end", () => {
    const result = getAllDatesInRange("2026-01-15", "2026-01-15");

    expect(result).toEqual(["2026-01-15"]);
  });

  it("handles month boundaries correctly", () => {
    const result = getAllDatesInRange("2026-01-30", "2026-02-02");

    expect(result).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
  });
});

describe("prepareChartData - transforms stats into chart-ready data", () => {
  it("fills missing dates with zero counts", () => {
    const stats: AppActivityStats = {
      totalEntries: 20,
      parseErrors: 0,
      countsByApp: {
        sshd: {
          app: "sshd",
          totalEntries: 20,
          byDay: {
            "2026-01-15": 10,
            "2026-01-17": 10,
          },
        },
      },
    };
    const allDates = ["2026-01-15", "2026-01-16", "2026-01-17"];

    const result = prepareChartData(stats, allDates);
    const chart = result[0];

    assert.ok(chart);
    expect(chart.series).toEqual([10, 0, 10]);
  });

  it("sorts apps by total entries descending", () => {
    const stats: AppActivityStats = {
      totalEntries: 150,
      parseErrors: 0,
      countsByApp: {
        sshd: {
          app: "sshd",
          totalEntries: 50,
          byDay: { "2026-01-15": 50 },
        },
        kernel: {
          app: "kernel",
          totalEntries: 100,
          byDay: { "2026-01-15": 100 },
        },
      },
    };
    const allDates = ["2026-01-15"];

    const result = prepareChartData(stats, allDates);
    const chart0 = result[0];
    const chart1 = result[1];

    assert.ok(chart0);
    assert.ok(chart1);
    expect(chart0.app).toBe("kernel");
    expect(chart1.app).toBe("sshd");
  });

  it("formats date labels as MM-DD", () => {
    const stats: AppActivityStats = {
      totalEntries: 10,
      parseErrors: 0,
      countsByApp: {
        app1: {
          app: "app1",
          totalEntries: 10,
          byDay: { "2026-01-15": 10 },
        },
      },
    };
    const allDates = ["2026-01-15"];

    const result = prepareChartData(stats, allDates);
    const chart = result[0];

    assert.ok(chart);
    expect(chart.labels).toEqual(["01-15"]);
  });

  it("sanitizes app names for HTML IDs", () => {
    const stats: AppActivityStats = {
      totalEntries: 10,
      parseErrors: 0,
      countsByApp: {
        "cups.cups-browsed": {
          app: "cups.cups-browsed",
          totalEntries: 10,
          byDay: { "2026-01-15": 10 },
        },
      },
    };
    const allDates = ["2026-01-15"];

    const result = prepareChartData(stats, allDates);
    const chart = result[0];

    assert.ok(chart);
    expect(chart.appId).toBe("cups_cups-browsed");
  });
});
