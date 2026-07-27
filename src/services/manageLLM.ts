import { ManageDatabaseRequestType, ManageDatabaseResponseType, ManageDatabaseResponseSchema } from "../types/request";
import pino from "pino";

const logger = pino();

export async function manageDatabaseLLM(request: ManageDatabaseRequestType): Promise<ManageDatabaseResponseType> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  // 1. Decode schema
  const schemaText = Buffer.from(request.schemaBase64, "base64").toString("utf-8");
  
  // 2. Validate size (~100k chars to prevent context explosion)
  if (schemaText.length > 100000) {
    throw new Error("Schema is too large. Maximum supported size is ~100k characters.");
  }

  if (schemaText.length < 10) {
    throw new Error("Decoded schema is empty or too short.");
  }

  // 3. Define system prompts based on action
  let systemPrompt = "";
  if (request.action === "migrate") {
    systemPrompt = `You are an expert database administrator. 
Given the existing database schema and a requested change, generate safe UP and DOWN SQL or ORM migration scripts.
Output valid JSON adhering to this schema:
{
  "status": "success",
  "action": "migrate",
  "result": "<The full UP and DOWN migration script as a single string. Do not wrap in markdown>",
  "metadata": { "tablesAffected": 2, "notes": "Short explanation of changes" }
}`;
  } else if (request.action === "optimize") {
    systemPrompt = `You are a query optimization expert. 
Analyze the provided SQL query against the provided schema. Identify bottlenecks (missing indexes, N+1, full table scans) and provide a rewritten optimized query plus necessary CREATE INDEX statements.
Output valid JSON adhering to this schema:
{
  "status": "success",
  "action": "optimize",
  "result": "<The rewritten optimized SQL and CREATE INDEX statements. Do not wrap in markdown>",
  "metadata": { "tablesAffected": 0, "notes": "Short explanation of the bottleneck and fix" }
}`;
  } else if (request.action === "seed") {
    systemPrompt = `You are a database seeding expert. 
Given the database schema, generate highly realistic, domain-specific SQL INSERT statements to seed the database with test data. Ensure foreign keys match.
Output valid JSON adhering to this schema:
{
  "status": "success",
  "action": "seed",
  "result": "<The full SQL INSERT scripts. Do not wrap in markdown>",
  "metadata": { "tablesAffected": 3, "notes": "Description of data generated" }
}`;
  } else if (request.action === "query") {
    systemPrompt = `You are an expert SQL developer. 
Translate the user's natural language request into a precise, efficient SQL query based on the provided schema.
Output valid JSON adhering to this schema:
{
  "status": "success",
  "action": "query",
  "result": "<The exact SQL query. Do not wrap in markdown>",
  "metadata": { "tablesAffected": 0, "notes": "Explanation of the query logic" }
}`;
  }

  const userPrompt = `Existing Schema:
"""
${schemaText}
"""

Task Prompt:
${request.prompt}`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  logger.info({ msg: "Calling DeepSeek LLM for Manage action", action: request.action, schemaLength: schemaText.length });

  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
          messages,
          max_tokens: 8000,
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
      const validated = ManageDatabaseResponseSchema.parse(parsedJSON);
      
      return validated;
      
    } catch (error: any) {
      lastError = error;
      logger.warn({ msg: `LLM attempt ${attempt} failed for manage action`, error: error.message });
      
      messages.push({
        role: "user",
        content: `Your previous output failed validation: ${error.message}. Return ONLY a valid JSON object matching the requested schema exactly.`
      });
    }
  }

  throw new Error(`Manage LLM generation failed after 3 attempts. Last error: ${lastError?.message}`);
}
