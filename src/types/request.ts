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
