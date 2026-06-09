export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

export interface LoggerOptions {
  service: string;
  level?: LogLevel;
  bindings?: Record<string, unknown>;
}

/**
 * Minimal dependency-free structured JSON logger.
 * One line per record — friendly to Loki/Promtail and `kubectl logs`.
 */
export function createLogger(options: LoggerOptions): Logger {
  const minWeight = LEVEL_WEIGHT[options.level ?? "info"];
  const base = { service: options.service, ...options.bindings };

  function emit(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (LEVEL_WEIGHT[level] < minWeight) return;
    const record = {
      level,
      time: new Date().toISOString(),
      message,
      ...base,
      ...meta,
    };
    const line = JSON.stringify(record);
    if (level === "error" || level === "warn") process.stderr.write(`${line}\n`);
    else process.stdout.write(`${line}\n`);
  }

  return {
    debug: (m, meta) => emit("debug", m, meta),
    info: (m, meta) => emit("info", m, meta),
    warn: (m, meta) => emit("warn", m, meta),
    error: (m, meta) => emit("error", m, meta),
    child: (bindings) =>
      createLogger({ ...options, bindings: { ...options.bindings, ...bindings } }),
  };
}
