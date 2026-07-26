import { SchemaDefinition } from "../types/schema";
import { generateSQL } from "./sql";

export function generateMigration(schema: SchemaDefinition): string {
  const sql = generateSQL(schema);
  
  let migration = `-- Migration: 001_initial
-- Created at: ${new Date().toISOString()}

-- ==========================================
-- UP
-- ==========================================

`;

  migration += sql;

  migration += `\n-- ==========================================
-- DOWN
-- ==========================================

`;

  // Drop foreign keys if they were added
  for (const table of [...schema.tables].reverse()) {
    for (const col of table.columns) {
      if (col.references) {
        migration += `ALTER TABLE ${table.name} DROP CONSTRAINT IF EXISTS fk_${table.name}_${col.name};\n`;
      }
    }
  }

  // Drop tables in reverse order to respect dependencies somewhat
  // (Foreign keys were dropped first, so order matters slightly less)
  for (const table of [...schema.tables].reverse()) {
    migration += `DROP TABLE IF EXISTS ${table.name} CASCADE;\n`;
  }

  // Drop enums
  if (schema.database === "postgresql") {
    for (const enm of schema.enums) {
      migration += `DROP TYPE IF EXISTS ${enm.name};\n`;
    }
  }

  return migration;
}
