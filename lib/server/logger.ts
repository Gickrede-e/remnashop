type LogLevel = "info" | "warn" | "error";

function writeLog(level: LogLevel, msg: string, fields: Record<string, unknown> = {}) {
  process.stdout.write(
    `${JSON.stringify({
      ts: new Date().toISOString(),
      level,
      msg,
      ...fields
    })}\n`
  );
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    message: typeof error === "string" ? error : "Unknown error"
  };
}

export const logger = {
  info(msg: string, fields?: Record<string, unknown>) {
    writeLog("info", msg, fields);
  },
  warn(msg: string, fields?: Record<string, unknown>) {
    writeLog("warn", msg, fields);
  },
  error(msg: string, fields?: Record<string, unknown>) {
    writeLog("error", msg, fields);
  }
};
