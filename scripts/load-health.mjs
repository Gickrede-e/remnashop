import http from "node:http";

import autocannon from "autocannon";

function readNumberArg(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return fallback;
  }

  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : fallback;
}

function readStringArg(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function runAutocannon(options) {
  return new Promise((resolve, reject) => {
    autocannon(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });
}

async function maybeCreateSelfHostedTarget(enabled) {
  if (!enabled) {
    return null;
  }

  const server = http.createServer((_, response) => {
    response.writeHead(200, {
      "Content-Type": "application/json"
    });
    response.end(JSON.stringify({ ok: true }));
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve self-hosted load-test address");
  }

  return {
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
    url: `http://127.0.0.1:${address.port}/api/health`
  };
}

async function main() {
  const selfHosted = await maybeCreateSelfHostedTarget(hasFlag("--self-host"));
  const url = readStringArg("--url") ?? process.env.LOAD_TEST_URL ?? selfHosted?.url ?? "http://127.0.0.1:3000/api/health";
  const connections = readNumberArg("--connections", Number(process.env.LOAD_TEST_CONNECTIONS) || 20);
  const duration = readNumberArg("--duration", Number(process.env.LOAD_TEST_DURATION) || 5);
  const minAverageReqPerSec = readNumberArg("--min-avg-req-per-sec", Number(process.env.LOAD_TEST_MIN_AVG_REQ_PER_SEC) || 50);
  const maxP99LatencyMs = readNumberArg("--max-p99-ms", Number(process.env.LOAD_TEST_MAX_P99_MS) || 250);
  const maxErrors = readNumberArg("--max-errors", Number(process.env.LOAD_TEST_MAX_ERRORS) || 0);

  try {
    const result = await runAutocannon({
      url,
      connections,
      duration,
      headers: {
        accept: "application/json"
      }
    });

    const summary = {
      url,
      connections,
      duration,
      requestsAverage: Number(result.requests.average.toFixed(2)),
      latencyP99: Number(result.latency.p99.toFixed(2)),
      errors: result.errors,
      timeouts: result.timeouts,
      non2xx: result.non2xx
    };

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

    const failures = [];
    if (summary.requestsAverage < minAverageReqPerSec) {
      failures.push(
        `Average throughput ${summary.requestsAverage} req/s is below the minimum ${minAverageReqPerSec} req/s`
      );
    }

    if (summary.latencyP99 > maxP99LatencyMs) {
      failures.push(`p99 latency ${summary.latencyP99} ms exceeds ${maxP99LatencyMs} ms`);
    }

    if (summary.errors + summary.timeouts + summary.non2xx > maxErrors) {
      failures.push(
        `Total request failures ${summary.errors + summary.timeouts + summary.non2xx} exceed the limit ${maxErrors}`
      );
    }

    if (failures.length > 0) {
      throw new Error(`Load test thresholds failed:\n${failures.join("\n")}`);
    }
  } finally {
    await selfHosted?.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
