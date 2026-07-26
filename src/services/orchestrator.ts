import { GenerateSchemaRequestType } from "../types/request";
import { generateSchemaDefinition } from "./llm";
import { generateSQL } from "../generators/sql";
import { generatePrisma } from "../generators/prisma";
import { generateDrizzle } from "../generators/drizzle";
import { generateMigration } from "../generators/migration";
import { generateSeedSQL, generateSeedTS } from "../generators/seed";
import { generateRoutes } from "../generators/api";
import { generateValidation } from "../generators/validation";
import { generateERDiagram } from "../generators/er-diagram";
import { generateOpenAPI } from "../generators/openapi";
import { generateReadme } from "../generators/readme";
import { createZipStream, FileContent } from "../utils/zip";

export async function orchestrateGeneration(request: GenerateSchemaRequestType) {
  // 1. Get schema definition from LLM
  const schema = await generateSchemaDefinition(request);
  
  // 2. Generate all files
  const files: FileContent[] = [];

  // SQL Schema
  files.push({ name: "schema.sql", content: generateSQL(schema) });
  
  // ORM
  if (request.options.orm === "prisma") {
    files.push({ name: "prisma/schema.prisma", content: generatePrisma(schema) });
  } else {
    files.push({ name: "src/db/schema.ts", content: generateDrizzle(schema) });
  }

  // Migration
  files.push({ name: "migrations/001_initial.sql", content: generateMigration(schema) });

  // Seed Data
  if (request.options.seedCount > 0) {
    files.push({ name: "seed.sql", content: generateSeedSQL(schema, request.options.seedCount) });
    files.push({ name: "src/db/seed.ts", content: generateSeedTS(schema, request.options.seedCount) });
  }

  // API
  if (request.options.apiStyle === "rest") {
    files.push({ name: "src/api/routes.ts", content: generateRoutes(schema) });
    files.push({ name: "src/api/validation.ts", content: generateValidation(schema) });
  }

  // Docs
  files.push({ name: "er-diagram.mmd", content: generateERDiagram(schema) });
  files.push({ name: "openapi.yaml", content: generateOpenAPI(schema) });
  files.push({ name: "README.md", content: generateReadme(schema, request.options.orm) });

  // 3. Create zip
  const zipBuffer = await createZipStream(files);

  return {
    zipBuffer,
    stats: {
      tableCount: schema.tables.length,
      endpointCount: request.options.apiStyle === "rest" ? schema.tables.length * 5 : 0
    }
  };
}
