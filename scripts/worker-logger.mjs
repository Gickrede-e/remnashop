// Minimal ESM logger mirror for scripts/worker.mjs.
// Kept in sync with lib/server/logger.ts output schema.
// TODO: Replace with direct import from lib/server/logger once the worker migrates to TS
// (see docs/TZ_FIXES.md task 5).

const levelOrder = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const minLevel = levelOrder[(process.env.LOG_LEVEL ?? "info").toLowerCase()] ?? levelOrder.info;

function write(level, msg, fields = {}) {
  if ((levelOrder[level] ?? levelOrder.info) < minLevel) {
    return;
  }

  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    component: "worker",
    ...fields
  };

  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

export function serializeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 15).join("\n")
    };
  }

  return {
    message: String(error)
  };
}

export const workerLogger = {
  debug(msg, fields) {
    write("debug", msg, fields);
  },
  info(msg, fields) {
    write("info", msg, fields);
  },
  warn(msg, fields) {
    write("warn", msg, fields);
  },
  error(msg, fields) {
    write("error", msg, fields);
  }
};
