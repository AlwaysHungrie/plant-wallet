type Level = "info" | "warn" | "error";

function log(level: Level, msg: string, meta?: Record<string, unknown>): void {
  const entry: Record<string, unknown> = { ts: new Date().toISOString(), level, msg };
  if (meta) entry.meta = meta;
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(JSON.stringify(entry));
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
};
