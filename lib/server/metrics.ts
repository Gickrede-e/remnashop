import "server-only";

import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

// Singleton registry. We avoid prom-client's default global register so HMR
// and parallel tests don't double-register metrics.
declare global {
  var prometheusRegistryGlobal: Registry | undefined;
  var prometheusMetricsGlobal: AppMetrics | undefined;
}

type AppMetrics = {
  webhookReceived: Counter<"provider">;
  webhookRejected: Counter<"provider" | "reason">;
  paymentActivationFailed: Counter<"provider" | "phase">;
  paymentActivated: Counter<"provider">;
  otpAttempts: Counter<"type" | "outcome">;
  otpExhausted: Counter<"type">;
  rateLimitExceeded: Counter<"key">;
  healthCheckFailed: Counter<"component">;
  cronExecutionDurationSeconds: Histogram<"job" | "outcome">;
};

function buildMetrics(registry: Registry): AppMetrics {
  collectDefaultMetrics({ register: registry, prefix: "gickshop_" });

  return {
    webhookReceived: new Counter({
      name: "gickshop_webhook_received_total",
      help: "Webhook callbacks accepted by the application, by provider.",
      labelNames: ["provider"],
      registers: [registry]
    }),
    webhookRejected: new Counter({
      name: "gickshop_webhook_rejected_total",
      help: "Webhook callbacks rejected before processing (bad IP, body too large, etc).",
      labelNames: ["provider", "reason"],
      registers: [registry]
    }),
    paymentActivationFailed: new Counter({
      name: "gickshop_payment_activation_failed_total",
      help: "Payments that reached the activation flow but failed to provision.",
      labelNames: ["provider", "phase"],
      registers: [registry]
    }),
    paymentActivated: new Counter({
      name: "gickshop_payment_activated_total",
      help: "Payments successfully activated end-to-end (Remnawave + DB linked).",
      labelNames: ["provider"],
      registers: [registry]
    }),
    otpAttempts: new Counter({
      name: "gickshop_otp_attempts_total",
      help: "OTP verification attempts. outcome=success|wrong_code|expired|exhausted.",
      labelNames: ["type", "outcome"],
      registers: [registry]
    }),
    otpExhausted: new Counter({
      name: "gickshop_otp_exhausted_total",
      help: "OTP tokens that hit the brute-force cap and were burned.",
      labelNames: ["type"],
      registers: [registry]
    }),
    rateLimitExceeded: new Counter({
      name: "gickshop_rate_limit_exceeded_total",
      help: "Rate-limit rejections, by logical key prefix.",
      labelNames: ["key"],
      registers: [registry]
    }),
    healthCheckFailed: new Counter({
      name: "gickshop_health_check_failed_total",
      help: "Number of /api/health probes that returned 503, broken down by component.",
      labelNames: ["component"],
      registers: [registry]
    }),
    cronExecutionDurationSeconds: new Histogram({
      name: "gickshop_cron_execution_duration_seconds",
      help: "Wall-time per cron tick. outcome=success|skipped|failed.",
      labelNames: ["job", "outcome"],
      buckets: [0.1, 0.5, 1, 5, 15, 60, 300],
      registers: [registry]
    })
  };
}

function getRegistry(): Registry {
  if (!globalThis.prometheusRegistryGlobal) {
    globalThis.prometheusRegistryGlobal = new Registry();
  }
  return globalThis.prometheusRegistryGlobal;
}

export function getMetrics(): AppMetrics {
  if (!globalThis.prometheusMetricsGlobal) {
    globalThis.prometheusMetricsGlobal = buildMetrics(getRegistry());
  }
  return globalThis.prometheusMetricsGlobal;
}

export async function renderMetrics() {
  // Touch the metrics object to ensure all collectors are registered before
  // the first scrape, even on a cold container.
  getMetrics();
  return getRegistry().metrics();
}

export function getMetricsContentType() {
  return getRegistry().contentType;
}
