export class AppError extends Error {
  code: string;
  status: number;
  fieldErrors?: Record<string, string[]>;
  retryable?: boolean;

  constructor(options: {
    code: string;
    message: string;
    status?: number;
    fieldErrors?: Record<string, string[]>;
    retryable?: boolean;
  }) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status ?? 400;
    this.fieldErrors = options.fieldErrors;
    this.retryable = options.retryable;
  }
}

export function toAppError(error: unknown) {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError({
      code: "INTERNAL_ERROR",
      message: error.message || "Unexpected error",
      status: 500
    });
  }

  return new AppError({
    code: "INTERNAL_ERROR",
    message: "Unexpected error",
    status: 500
  });
}
