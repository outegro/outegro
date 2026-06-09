import os from "node:os";
import { monitorEventLoopDelay } from "node:perf_hooks";

// Prometheus exposition endpoint for the Next.js server process itself.
// Scraped by kube-prometheus-stack (PodMonitor) in-cluster.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

declare global {
  var exampleWebMetricsScrapes: number | undefined;
}

const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
eventLoopDelay.enable();

function labelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
}

function metric(name: string, value: number, labels?: Record<string, string>): string {
  const suffix = labels
    ? `{${Object.entries(labels)
        .map(([key, label]) => `${key}="${labelValue(label)}"`)
        .join(",")}}`
    : "";
  return `${name}${suffix} ${Number.isFinite(value) ? value : 0}`;
}

export function GET(): Response {
  globalThis.exampleWebMetricsScrapes = (globalThis.exampleWebMetricsScrapes ?? 0) + 1;

  const memory = process.memoryUsage();
  const cpu = process.cpuUsage();
  const load = os.loadavg();

  const labels = {
    service: "example-web",
    node_version: process.version,
    node_env: process.env.NODE_ENV ?? "unknown",
  };

  const lines = [
    "# HELP app_info Application metadata.",
    "# TYPE app_info gauge",
    metric("app_info", 1, labels),
    "# HELP app_metrics_scrapes_total Total metrics endpoint scrapes served by this process.",
    "# TYPE app_metrics_scrapes_total counter",
    metric("app_metrics_scrapes_total", globalThis.exampleWebMetricsScrapes),
    "# HELP process_uptime_seconds Process uptime in seconds.",
    "# TYPE process_uptime_seconds gauge",
    metric("process_uptime_seconds", process.uptime()),
    "# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.",
    "# TYPE process_cpu_user_seconds_total counter",
    metric("process_cpu_user_seconds_total", cpu.user / 1e6),
    "# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds.",
    "# TYPE process_cpu_system_seconds_total counter",
    metric("process_cpu_system_seconds_total", cpu.system / 1e6),
    "# HELP process_resident_memory_bytes Resident set size in bytes.",
    "# TYPE process_resident_memory_bytes gauge",
    metric("process_resident_memory_bytes", memory.rss),
    "# HELP nodejs_heap_size_used_bytes Used V8 heap size in bytes.",
    "# TYPE nodejs_heap_size_used_bytes gauge",
    metric("nodejs_heap_size_used_bytes", memory.heapUsed),
    "# HELP nodejs_eventloop_delay_mean_seconds Mean event loop delay in seconds.",
    "# TYPE nodejs_eventloop_delay_mean_seconds gauge",
    metric("nodejs_eventloop_delay_mean_seconds", eventLoopDelay.mean / 1e9),
    "# HELP system_load_average_1m System load average over 1 minute.",
    "# TYPE system_load_average_1m gauge",
    metric("system_load_average_1m", load[0] ?? 0),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
