import { z } from "zod";

export const GenerateSchemaRequest = z.object({
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description too long"),
  options: z.object({
    database: z.enum(["postgresql", "mysql", "sqlite"]).default("postgresql"),
    orm: z.enum(["prisma", "drizzle"]).default("drizzle"),
    apiStyle: z.enum(["rest", "none"]).default("rest"),
    includeAuth: z.boolean().default(true),
    includeTimestamps: z.boolean().default(true),
    includeSoftDelete: z.boolean().default(false),
    seedCount: z.number().min(0).max(100).default(30)
  }).default({} as any)
});

export type GenerateSchemaRequestType = z.infer<typeof GenerateSchemaRequest>;

export const ManageDatabaseRequest = z.object({
  action: z.enum(["migrate", "optimize", "seed", "query"]),
  schemaBase64: z.string().min(1, "Schema cannot be empty"),
  prompt: z.string().min(3, "Prompt must be at least 3 characters").max(5000, "Prompt too long")
});

export type ManageDatabaseRequestType = z.infer<typeof ManageDatabaseRequest>;

export const ManageDatabaseResponseSchema = z.object({
  status: z.literal("success").default("success"),
  action: z.string(),
  result: z.string(),
  metadata: z.object({
    tablesAffected: z.number().optional(),
    notes: z.string().optional()
  }).optional()
});

export type ManageDatabaseResponseType = z.infer<typeof ManageDatabaseResponseSchema>;
