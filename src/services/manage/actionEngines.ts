import pino from "pino";
import { EngineContext, EngineResult } from "./types";
import { MIGRATE_PROMPT, OPTIMIZE_PROMPT, SEED_PROMPT, QUERY_PROMPT } from "./prompts";
import { TableDefinition } from "../../types/schema";

const logger = pino();

async function callEngineLLM(systemPrompt: string, userPrompt: string, context: EngineContext): Promise<any> {
  const schemaContextStr = context.normalized.schema
    ? JSON.stringify(context.normalized.schema)
    : context.normalized.originalText;

  const response = await fetch(`${process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Context:\nDialect: ${context.normalized.dialect || 'postgresql'}\nSchema:\n${schemaContextStr}\n\nUser Request:\n${userPrompt}` }
      ],
      max_tokens: 8000,
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`Engine LLM failed: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

export async function migrateEngine(context: EngineContext): Promise<EngineResult> {
  const result = await callEngineLLM(MIGRATE_PROMPT, context.request.prompt, context);
  return {
    action: "migrate",
    ...result
  };
}

export async function optimizeEngine(context: EngineContext): Promise<EngineResult> {
  const result = await callEngineLLM(OPTIMIZE_PROMPT, context.request.prompt, context);
  return {
    action: "optimize",
    ...result
  };
}

export async function queryEngine(context: EngineContext): Promise<EngineResult> {
  const result = await callEngineLLM(QUERY_PROMPT, context.request.prompt, context);
  return {
    action: "query",
    ...result
  };
}

export async function seedEngine(context: EngineContext): Promise<EngineResult> {
  // 1. Get raw JSON data from LLM
  const llmOutput = await callEngineLLM(SEED_PROMPT, context.request.prompt, context);
  
  // 2. Parse the resultString which should contain JSON mapping tables to rows
  let rowData: Record<string, any[]> = {};
  try {
    rowData = JSON.parse(llmOutput.resultString);
  } catch (e) {
    // Fallback if LLM didn't stringify it properly
    rowData = llmOutput.resultString as any;
  }

  // 3. Deterministic Topological Sort of tables
  const tables = context.normalized.schema?.tables || [];
  const sortedTables = topologicalSort(tables);

  // 4. Generate SQL INSERTS in deterministic order
  let sqlChunks: string[] = [];
  let totalRows = 0;

  for (const table of sortedTables) {
    const rows = rowData[table.name] || [];
    if (rows.length === 0) continue;

    const columns = Object.keys(rows[0]);
    if (columns.length === 0) continue;

    const valuesChunks = rows.map(row => {
      totalRows++;
      const vals = columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        return val;
      });
      return `(${vals.join(', ')})`;
    });

    sqlChunks.push(`INSERT INTO ${table.name} (${columns.join(', ')}) VALUES\n  ${valuesChunks.join(',\n  ')};`);
  }

  return {
    action: "seed",
    analysis: llmOutput.analysis,
    resultString: sqlChunks.join('\n\n'),
    warnings: llmOutput.warnings,
    tablesAffected: sortedTables.length
  };
}

// Helper for Seed Engine
function topologicalSort(tables: TableDefinition[]): TableDefinition[] {
  const sorted: TableDefinition[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const tableMap = new Map(tables.map(t => [t.name, t]));

  function visit(tableName: string) {
    if (visited.has(tableName)) return;
    if (visiting.has(tableName)) return; // circular dependency, ignore and continue

    visiting.add(tableName);
    const table = tableMap.get(tableName);
    
    if (table) {
      for (const col of table.columns) {
        if (col.references && col.references.table !== tableName) {
          visit(col.references.table);
        }
      }
      sorted.push(table);
    }
    visiting.delete(tableName);
    visited.add(tableName);
  }

  for (const table of tables) {
    visit(table.name);
  }

  return sorted;
}
