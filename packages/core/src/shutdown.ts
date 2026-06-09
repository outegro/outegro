import type { Logger } from "./logger";

export type ShutdownHandler = () => Promise<void> | void;

export interface ShutdownOptions {
  logger?: Pick<Logger, "info" | "error">;
  /** Hard-exit deadline if handlers hang (ms). */
  timeoutMs?: number;
  signals?: NodeJS.Signals[];
}

/**
 * Register graceful shutdown: on SIGTERM/SIGINT run handlers (LIFO), then exit.
 * Kubernetes sends SIGTERM before the grace period — drain here.
 */
export function onShutdown(handlers: ShutdownHandler[], options: ShutdownOptions = {}): void {
  const { logger, timeoutMs = 10_000, signals = ["SIGTERM", "SIGINT"] } = options;
  let shuttingDown = false;

  const run = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger?.info(`Received ${signal}, shutting down gracefully`);

    const timer = setTimeout(() => {
      logger?.error(`Shutdown timed out after ${timeoutMs}ms, forcing exit`);
      process.exit(1);
    }, timeoutMs);
    timer.unref();

    try {
      for (const handler of [...handlers].reverse()) {
        await handler();
      }
      clearTimeout(timer);
      process.exit(0);
    } catch (error) {
      logger?.error("Error during shutdown", { error: String(error) });
      process.exit(1);
    }
  };

  for (const signal of signals) {
    process.on(signal, () => void run(signal));
  }
}
