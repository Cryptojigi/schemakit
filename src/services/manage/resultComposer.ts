import { EngineResult } from "./types";

export function composeRichResult(engineResult: EngineResult): string {
  const parts: string[] = [];

  // 1. Analysis
  if (engineResult.analysis || engineResult.tablesAffected !== undefined) {
    parts.push("### Analysis");
    if (engineResult.tablesAffected !== undefined) {
      parts.push(`**Tables affected:** ${engineResult.tablesAffected}`);
    }
    if (engineResult.analysis) {
      parts.push(engineResult.analysis);
    }
    parts.push("");
  }

  // 2. Warnings
  if (engineResult.warnings && engineResult.warnings.length > 0) {
    parts.push("### Warnings");
    engineResult.warnings.forEach(w => parts.push(`> ${w}`));
    parts.push("");
  }

  // 3. Main Script
  if (engineResult.resultString) {
    const title = getTitleForAction(engineResult.action);
    parts.push(`### ${title}`);
    parts.push("```sql");
    parts.push(engineResult.resultString.trim());
    parts.push("```");
    parts.push("");
  }

  // 4. Down Script (Migrations)
  if (engineResult.downScript) {
    parts.push("### DOWN Migration");
    parts.push("```sql");
    parts.push(engineResult.downScript.trim());
    parts.push("```");
    parts.push("");
  }

  // 5. Recommended Indexes (Optimization)
  if (engineResult.recommendedIndexes) {
    parts.push("### Recommended Indexes");
    parts.push("```sql");
    parts.push(engineResult.recommendedIndexes.trim());
    parts.push("```");
    parts.push("");
  }

  // 6. Notes
  if (engineResult.notes) {
    parts.push("### Notes");
    parts.push(engineResult.notes);
    parts.push("");
  }

  return parts.join("\n").trim();
}

function getTitleForAction(action: string): string {
  switch (action) {
    case "migrate": return "UP Migration";
    case "optimize": return "Optimized Query";
    case "seed": return "Seed Script";
    case "query": return "Generated SQL";
    default: return "Result";
  }
}
