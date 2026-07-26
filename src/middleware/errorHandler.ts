import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import pino from "pino";

const logger = pino();

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation Error",
      details: err.issues
    });
  }

  if (err.message && err.message.includes("LLM")) {
    logger.error({ msg: "LLM Error", error: err.message, stack: err.stack });
    return res.status(502).json({
      error: "AI Generation Failed",
      message: "The AI failed to generate a valid schema. Please try rephrasing your description."
    });
  }

  logger.error({ msg: "Unhandled Error", error: err.message || err, stack: err.stack });
  res.status(500).json({
    error: "Internal Server Error",
    message: "An unexpected error occurred while generating your schema."
  });
}
