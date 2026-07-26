import OpenAI from "openai";
import { SchemaDefinition } from "../types/schema";
import { GenerateSchemaRequestType } from "../types/request";
import pino from "pino";

const logger = pino();

const SYSTEM_PROMPT = `You are Schemakit, a senior database architect with 15 years of experience designing production schemas for startups and enterprises.

Given an application description, you MUST output a valid JSON object conforming exactly to the SchemaDefinition type.

RULES:
1. Every table MUST have a primary key. Use \`uuid\` with \`gen_random_uuid()\` default for PostgreSQL, \`serial\` for MySQL.
2. All table and column names MUST be snake_case.
3. Every foreign key MUST have an explicit onDelete action.
4. Add appropriate indexes on: foreign key columns, columns likely used in WHERE clauses, columns used in ORDER BY.
5. Use precise types — don't use TEXT where VARCHAR(255) suffices. Use DECIMAL for money, not FLOAT.
6. Add CHECK constraints where logically appropriate (e.g., price > 0, rating BETWEEN 1 AND 5).
7. If the user mentions authentication, add a \`users\` table with: id, email (unique), password_hash, role (enum), email_verified, last_login, created_at, updated_at.
8. ALWAYS include created_at (TIMESTAMPTZ, DEFAULT now()) and updated_at (TIMESTAMPTZ, DEFAULT now()) on every table unless the user explicitly says not to.
9. Think about edge cases: What happens when a referenced record is deleted? What columns need uniqueness constraints? What data needs to be NOT NULL?
10. Generate realistic enum values that match the domain.
11. Include a \`description\` field for every table and column — these become code comments and API documentation.
12. Limit output to the tables directly described or clearly implied. Don't invent tables the user didn't ask for (except junction tables for many-to-many relationships).
13. For many-to-many relationships, create explicit junction tables.

OUTPUT FORMAT: Respond ONLY with the JSON object. No markdown, no explanation, no code fences.`;

export async function generateSchemaDefinition(request: GenerateSchemaRequestType): Promise<SchemaDefinition> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
  });

  const userPrompt = `Design the complete database schema for this application:

"""
${request.description}
"""

Database: ${request.options.database}
Include authentication tables: ${request.options.includeAuth}
Include timestamps: ${request.options.includeTimestamps}
Include soft delete: ${request.options.includeSoftDelete}

Output the SchemaDefinition JSON.`;

  logger.info({ msg: "Calling DeepSeek LLM", descriptionLength: request.description.length });

  const response = await client.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 32000,
    top_p: 0.9,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from LLM");
  }

  try {
    const parsed = JSON.parse(content) as SchemaDefinition;
    return parsed;
  } catch (error) {
    logger.error({ msg: "Failed to parse LLM output as JSON", content });
    throw new Error("LLM output was not valid JSON");
  }
}
