import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;
  details: Record<string, unknown> | null;

  constructor(
    message: string,
    statusCode: number,
    details: Record<string, unknown> | null = null
  ) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFound = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(
    `Route not found: ${req.method} ${req.originalUrl}`,
    404
  );
  next(error);
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.details,
    });
    return;
  }

  if (err instanceof Error && err.name === "ValidationError") {
    const castErr = err as unknown as {
      errors: Record<string, { message: string }>;
    };
    const messages = Object.keys(castErr.errors || {}).reduce<
      Record<string, string>
    >((acc, key) => {
      acc[key] = castErr.errors[key].message;
      return acc;
    }, {});

    res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: messages,
    });
    return;
  }

  if (err instanceof Error && err.name === "CastError") {
    res.status(400).json({
      success: false,
      message: "Invalid resource ID provided.",
      errors: null,
    });
    return;
  }

  if (err instanceof Error && err.name === "MongoServerError") {
    const mongoErr = err as unknown as { code?: number; keyPattern?: object };
    if (mongoErr.code === 11000) {
      const field = Object.keys(mongoErr.keyPattern || {})[0] || "field";
      res.status(409).json({
        success: false,
        message: `A record with that ${field} already exists.`,
        errors: null,
      });
      return;
    }
  }

  const message = err instanceof Error ? err.message : "Internal server error.";
  console.error(err);
  res.status(500).json({
    success: false,
    message,
    errors: null,
  });
};