import { EngineResult } from "./types";

export function detectDestructiveOperations(sql: string): string[] {
  if (!sql) return [];
  const upperSql = sql.toUpperCase();
  const warnings: string[] = [];

  if (upperSql.includes("DROP TABLE")) {
    warnings.push("⚠️ DANGER: This script drops one or more tables. Data will be lost.");
  }
  if (upperSql.includes("DROP COLUMN")) {
    warnings.push("⚠️ DANGER: This script drops one or more columns. Data will be lost.");
  }
  if (upperSql.includes("TRUNCATE ")) {
    warnings.push("⚠️ DANGER: This script truncates a table. All data will be wiped.");
  }
  if (upperSql.includes("DELETE FROM") && !upperSql.includes("WHERE")) {
    warnings.push("⚠️ DANGER: This script contains a DELETE statement without a WHERE clause.");
  }

  return warnings;
}

export function applySafetyRules(engineResult: EngineResult): EngineResult {
  const newWarnings = [...(engineResult.warnings || [])];
  
  if (engineResult.resultString) {
    const destructiveWarnings = detectDestructiveOperations(engineResult.resultString);
    newWarnings.push(...destructiveWarnings);
  }
  
  if (engineResult.downScript) {
    const destructiveWarningsDown = detectDestructiveOperations(engineResult.downScript);
    newWarnings.push(...destructiveWarningsDown.map(w => w + " (in DOWN script)"));
  }

  return {
    ...engineResult,
    warnings: Array.from(new Set(newWarnings)) // Deduplicate
  };
}
