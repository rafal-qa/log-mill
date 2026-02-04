import { z } from "zod";

export const HttpAccessRecordSchema = z.object({
  ip: z.string(),
  timestamp: z.date(),
  method: z.string(),
  path: z.string(),
  protocol: z.string(),
  status: z.number(),
  size: z.number(),
  referer: z.string().nullable(),
  userAgent: z.string().nullable(),
});

export type HttpAccessRecord = z.infer<typeof HttpAccessRecordSchema>;

export const VisitorStatsSchema = z.object({
  totalRequests: z.number(),
  parseErrors: z.number(),
  requestsByDay: z.map(z.string(), z.number()),
});

export type VisitorStats = z.infer<typeof VisitorStatsSchema>;
