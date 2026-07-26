import { SchemaDefinition } from "../types/schema";

export function generateSQL(schema: SchemaDefinition): string {
  let sql = `-- ============================================
-- Schemakit Generated Schema
-- Database: ${schema.database}
-- ============================================

`;

  // Generate Enums for PostgreSQL
  if (schema.database === "postgresql" && schema.enums.length > 0) {
    sql += `-- Enums\n`;
    for (const enm of schema.enums) {
      const values = enm.values.map((v) => `'${v}'`).join(", ");
      sql += `CREATE TYPE ${enm.name} AS ENUM (${values});\n`;
    }
    sql += `\n`;
  }

  // Generate Tables
  const foreignKeys: string[] = [];

  for (const table of schema.tables) {
    if (table.description) {
      sql += `-- Table: ${table.name}\n-- ${table.description}\n`;
    }
    sql += `CREATE TABLE ${table.name} (\n`;

    const columnDefs: string[] = [];
    for (const col of table.columns) {
      let def = `  ${col.name} ${col.type}`;
      
      // Handle enum types for non-postgres or inline
      if (schema.database !== "postgresql" && schema.enums.some(e => e.name === col.type)) {
        const enm = schema.enums.find(e => e.name === col.type)!;
        const values = enm.values.map(v => `'${v}'`).join(", ");
        def = `  ${col.name} ENUM(${values})`;
      }

      if (col.primaryKey) def += " PRIMARY KEY";
      if (!col.nullable && !col.primaryKey) def += " NOT NULL";
      if (col.unique && !col.primaryKey) def += " UNIQUE";
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      
      if (col.references) {
        foreignKeys.push(`ALTER TABLE ${table.name} ADD CONSTRAINT fk_${table.name}_${col.name} FOREIGN KEY (${col.name}) REFERENCES ${col.references.table}(${col.references.column}) ON DELETE ${col.references.onDelete};`);
      }
      
      if (col.check) {
        def += ` CHECK (${col.check})`;
      }
      columnDefs.push(def);
    }

    if (table.timestamps) {
      if (schema.database === "postgresql") {
        columnDefs.push(`  created_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
        columnDefs.push(`  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
      } else {
        columnDefs.push(`  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        columnDefs.push(`  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
      }
    }
    if (table.softDelete) {
      columnDefs.push(`  deleted_at ${schema.database === 'postgresql' ? 'TIMESTAMPTZ' : 'TIMESTAMP'}`);
    }

    sql += columnDefs.join(",\n");
    sql += `\n);\n\n`;

    // Indexes
    for (const idx of table.indexes) {
      const type = idx.type ? ` USING ${idx.type}` : "";
      const unique = idx.unique ? "UNIQUE " : "";
      sql += `CREATE ${unique}INDEX ${idx.name} ON ${table.name}${type} (${idx.columns.join(", ")});\n`;
    }
    
    // Auto index foreign keys
    for (const col of table.columns) {
      if (col.references && !table.indexes.some(i => i.columns.includes(col.name))) {
        sql += `CREATE INDEX idx_${table.name}_${col.name} ON ${table.name} (${col.name});\n`;
      }
    }
    sql += `\n`;
  }

  if (foreignKeys.length > 0) {
    sql += `-- Foreign Keys\n`;
    sql += foreignKeys.join("\n") + "\n";
  }

  return sql;
}
