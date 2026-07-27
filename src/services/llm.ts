import OpenAI from "openai";
import { SchemaDefinition, SchemaDefinitionSchema } from "../types/schema";
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
14. REQUIRED FIELDS: The root JSON object MUST include "projectName" (string) and "database" (string). Every object in a table's "indexes" array MUST include a "name" (string) property.

OUTPUT FORMAT: Respond ONLY with the JSON object. No markdown, no explanation, no code fences.`;

export async function generateSchemaDefinition(request: GenerateSchemaRequestType): Promise<SchemaDefinition> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const userPrompt = `Design the complete database schema for this application:

"""
${request.description}
"""

Database: ${request.options.database}
Include authentication tables: ${request.options.includeAuth}
Include timestamps: ${request.options.includeTimestamps}
Include soft delete: ${request.options.includeSoftDelete}

Output the SchemaDefinition JSON.`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  logger.info({ msg: "Calling DeepSeek LLM", descriptionLength: request.description.length });

  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
          messages,
          max_tokens: 32000,
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API Error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      const parsedJSON = JSON.parse(content);
      const validatedSchema = SchemaDefinitionSchema.parse(parsedJSON);
      
      return validatedSchema as SchemaDefinition;
      
    } catch (error: any) {
      lastError = error;
      logger.warn({ msg: `LLM attempt ${attempt} failed`, error: error.message });
      
      messages.push({
        role: "user",
        content: `Your previous output failed validation with error: ${error.message}. Return ONLY a strictly valid JSON object matching the SchemaDefinition.`
      });
    }
  }

  throw new Error(`LLM generation failed after 3 attempts. Last error: ${lastError?.message}`);
}
