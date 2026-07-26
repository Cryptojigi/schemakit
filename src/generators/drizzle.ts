import { SchemaDefinition } from "../types/schema";
import { toCamelCase } from "../utils/naming";

export function generateDrizzle(schema: SchemaDefinition): string {
  let ts = `// Schemakit Generated Drizzle Schema\n`;
  const dbPrefix = schema.database === "postgresql" ? "pg" : schema.database === "mysql" ? "mysql" : "sqlite";
  
  if (schema.database === "postgresql") {
    ts += `import { pgTable, pgEnum, uuid, serial, varchar, text, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";\n`;
    ts += `import { relations } from "drizzle-orm";\n\n`;
  } else {
    // simplified imports for mysql/sqlite just for the generated file
    ts += `import { ${dbPrefix}Table, int, text, varchar, boolean, timestamp } from "drizzle-orm/${dbPrefix}-core";\n`;
    ts += `import { relations } from "drizzle-orm";\n\n`;
  }

  // Enums
  if (schema.database === "postgresql") {
    for (const enm of schema.enums) {
      const values = enm.values.map(v => `'${v}'`).join(", ");
      ts += `export const ${toCamelCase(enm.name)}Enum = pgEnum("${enm.name}", [${values}]);\n`;
    }
    ts += `\n`;
  }

  // Tables
  for (const table of schema.tables) {
    if (table.description) {
      ts += `/** ${table.description} */\n`;
    }
    
    ts += `export const ${toCamelCase(table.name)} = ${dbPrefix}Table("${table.name}", {\n`;
    
    for (const col of table.columns) {
      let colDef = `  ${toCamelCase(col.name)}: `;
      let drizzleType = mapSQLTypeToDrizzle(col.type, schema.enums, schema.database);
      
      colDef += `${drizzleType}("${col.name}")`;

      if (col.primaryKey) colDef += `.primaryKey()`;
      if (!col.nullable && !col.primaryKey) colDef += `.notNull()`;
      if (col.unique && !col.primaryKey) colDef += `.unique()`;
      
      if (col.references) {
        colDef += `.references(() => ${toCamelCase(col.references.table)}.${toCamelCase(col.references.column)}, { onDelete: "${col.references.onDelete.toLowerCase()}" })`;
      }
      
      if (col.defaultValue) {
        if (col.defaultValue.includes("now()") || col.defaultValue.includes("CURRENT_TIMESTAMP")) {
          colDef += `.defaultNow()`;
        } else if (col.defaultValue.includes("uuid")) {
          colDef += `.defaultRandom()`;
        }
      }

      ts += colDef + ",\n";
    }

    if (table.timestamps) {
      ts += `  createdAt: timestamp("created_at").defaultNow().notNull(),\n`;
      ts += `  updatedAt: timestamp("updated_at").defaultNow().notNull(),\n`;
    }
    if (table.softDelete) {
      ts += `  deletedAt: timestamp("deleted_at"),\n`;
    }

    ts += `});\n\n`;
  }

  // Relations
  for (const table of schema.tables) {
    const parentRelations = table.columns.filter(c => c.references);
    const childRelations = schema.tables.flatMap(t => 
      t.columns.filter(c => c.references?.table === table.name).map(c => ({
        table: t.name,
        column: c.name
      }))
    );

    if (parentRelations.length > 0 || childRelations.length > 0) {
      ts += `export const ${toCamelCase(table.name)}Relations = relations(${toCamelCase(table.name)}, ({ one, many }) => ({\n`;
      
      for (const rel of parentRelations) {
        const ref = rel.references!;
        ts += `  ${toCamelCase(ref.table)}: one(${toCamelCase(ref.table)}, {\n`;
        ts += `    fields: [${toCamelCase(table.name)}.${toCamelCase(rel.name)}],\n`;
        ts += `    references: [${toCamelCase(ref.table)}.${toCamelCase(ref.column)}],\n`;
        ts += `  }),\n`;
      }

      for (const child of childRelations) {
        ts += `  ${toCamelCase(child.table)}: many(${toCamelCase(child.table)}),\n`;
      }

      ts += `}));\n\n`;
    }
  }

  return ts;
}

function mapSQLTypeToDrizzle(sqlType: string, enums: any[], database: string): string {
  if (database === "postgresql" && enums.some(e => e.name === sqlType)) {
    return `${toCamelCase(sqlType)}Enum`;
  }
  if (sqlType === "uuid") return "uuid";
  if (sqlType.includes("serial")) return "serial";
  if (sqlType.includes("varchar")) return "varchar";
  if (sqlType.includes("text")) return "text";
  if (sqlType.includes("int")) return "integer";
  if (sqlType.includes("bool")) return "boolean";
  if (sqlType.includes("timestamp")) return "timestamp";
  if (sqlType.includes("decimal") || sqlType.includes("numeric")) return "decimal";
  
  return "text"; // fallback
}
