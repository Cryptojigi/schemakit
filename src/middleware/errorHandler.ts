import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import pino from "pino";
import { SchemaRequiredError } from "../utils/errors";

const logger = pino();

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    // Check if the error is specifically about a missing/empty schemaBase64
    const isSchemaError = err.issues.some(issue => issue.path.includes("schemaBase64"));
    if (isSchemaError) {
      return res.status(400).json({
        status: "error",
        code: "SCHEMA_REQUIRED",
        message: "No valid database schema provided.",
        guidance: {
          instruction: "As the calling agent, connect to the user's database and fetch the schema. Encode it as base64 and resend as schemaBase64.",
          methods: [
            "PostgreSQL/Supabase: SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name",
            "MySQL: SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_schema = DATABASE()",
            "Alternative: Use pg_dump --schema-only, or read schema.prisma / drizzle config files"
          ]
        }
      });
    }

    return res.status(400).json({
      error: "Validation Error",
      details: err.issues
    });
  }

  if (err instanceof SchemaRequiredError) {
    return res.status(400).json({
      status: "error",
      code: "SCHEMA_REQUIRED",
      message: err.message,
      guidance: {
        instruction: "As the calling agent, connect to the user's database and fetch the schema. Encode it as base64 and resend as schemaBase64.",
        methods: [
          "PostgreSQL/Supabase: SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name",
          "MySQL: SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_schema = DATABASE()",
          "Alternative: Use pg_dump --schema-only, or read schema.prisma / drizzle config files"
        ]
      }
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
