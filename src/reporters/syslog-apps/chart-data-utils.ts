import type {
  AppActivityStats,
  AppDayCount,
} from "../../processors/syslog-apps/processor.js";

interface ChartData {
  app: string;
  appId: string;
  totalEntries: number;
  labels: string[];
  series: number[];
}

function sanitizeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_");
}

export function getDateRange(stats: AppActivityStats): {
  minDate: string;
  maxDate: string;
} {
  const allDates: string[] = [];

  for (const app of Object.values(stats.countsByApp)) {
    allDates.push(...Object.keys(app.byDay));
  }

  allDates.sort();

  const minDate = allDates[0];
  const maxDate = allDates[allDates.length - 1];

  if (!minDate || !maxDate) {
    throw new Error("No dates found in stats");
  }

  return {
    minDate,
    maxDate,
  };
}

export function getAllDatesInRange(
  startDate: string,
  endDate: string,
): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function formatDateLabel(isoDate: string): string {
  return isoDate.slice(5);
}

function normalizeAppData(
  app: AppDayCount,
  allDates: string[],
): { labels: string[]; series: number[] } {
  const labels: string[] = [];
  const series: number[] = [];

  for (const date of allDates) {
    labels.push(formatDateLabel(date));
    series.push(app.byDay[date] ?? 0);
  }

  return { labels, series };
}

export function prepareChartData(
  stats: AppActivityStats,
  allDates: string[],
): ChartData[] {
  return Object.values(stats.countsByApp)
    .map((app) => {
      const { labels, series } = normalizeAppData(app, allDates);
      return {
        app: app.app,
        appId: sanitizeId(app.app),
        totalEntries: app.totalEntries,
        labels,
        series,
      };
    })
    .sort((a, b) => b.totalEntries - a.totalEntries);
}
