import pino from "pino";
import { SchemaDefinition, SchemaDefinitionSchema } from "../../types/schema";
import { NormalizedSchemaContext } from "./types";

const logger = pino();

const NORMALIZATION_PROMPT = `You are a database schema normalizer.
Your job is to read raw database schema inputs (which might be SQL DDL, Prisma schema, Drizzle schema, etc.) and convert it into a highly structured, valid JSON object conforming to the Schemakit SchemaDefinition format.

RULES:
1. Extract all tables, columns, constraints, foreign keys, and indexes accurately.
2. Infer the database dialect (postgresql, mysql, sqlite) from the syntax if possible, otherwise default to postgresql.
3. Preserve any valuable developer comments as descriptions.
4. If the input is severely truncated or malformed, extract whatever is structurally viable. Do not invent missing tables.
5. The output MUST be purely the valid JSON object. No markdown wrapping.
`;

export async function normalizeSchema(rawText: string): Promise<NormalizedSchemaContext> {
  // 1. Check if it's already a valid SchemaDefinition JSON
  try {
    const parsed = JSON.parse(rawText);
    const validated = SchemaDefinitionSchema.parse(parsed);
    return {
      originalText: rawText,
      schema: validated as SchemaDefinition,
      dialect: (validated.database as any) || 'postgresql',
      formatDetected: 'json',
      isFallback: false
    };
  } catch (e) {
    // Not valid JSON, proceed to LLM normalization
  }

  // 2. Format detection heuristics
  let formatDetected: NormalizedSchemaContext['formatDetected'] = 'unknown';
  if (rawText.includes('CREATE TABLE')) formatDetected = 'sql';
  else if (rawText.includes('generator client') || rawText.includes('model ')) formatDetected = 'prisma';
  else if (rawText.includes('pgTable') || rawText.includes('mysqlTable')) formatDetected = 'drizzle';

  logger.info({ msg: "Normalizing schema via LLM", formatDetected });

  try {
    const response = await fetch(`${process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: [
          { role: "system", content: NORMALIZATION_PROMPT },
          { role: "user", content: `Normalize this schema:\n\n${rawText}` }
        ],
        max_tokens: 16000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`LLM API returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsedJSON = JSON.parse(content);
    const validatedSchema = SchemaDefinitionSchema.parse(parsedJSON);

    return {
      originalText: rawText,
      schema: validatedSchema as SchemaDefinition,
      dialect: (validatedSchema.database as any) || 'postgresql',
      formatDetected,
      isFallback: false
    };
  } catch (error: any) {
    logger.warn({ msg: "Schema normalization failed, using fallback", error: error.message });
    // Graceful fallback: return the raw text flagged as fallback
    return {
      originalText: rawText,
      formatDetected,
      isFallback: true
    };
  }
}
