import { SchemaDefinition, ColumnDefinition } from "../types/schema";
import { toCamelCase, singularize } from "../utils/naming";

export function generateSeedSQL(schema: SchemaDefinition, count: number): string {
  let sql = `-- Schemakit Seed Data\n-- Generated for ${count} records per table\n\n`;

  for (const table of schema.tables) {
    sql += `-- Seed ${table.name}\n`;
    sql += `INSERT INTO ${table.name} (`;
    
    // We only seed non-generated columns for simplicity in SQL
    // But since this is a mock, we'll try to provide fake data for everything except default functions
    const insertCols = table.columns.filter(c => !c.defaultValue?.includes("()"));
    sql += insertCols.map(c => c.name).join(", ");
    sql += `) VALUES \n`;

    const rows = [];
    for (let i = 1; i <= count; i++) {
      const vals = insertCols.map(c => generateFakeSQLValue(c, i));
      rows.push(`  (${vals.join(", ")})`);
    }

    sql += rows.join(",\n") + ";\n\n";
  }

  return sql;
}

export function generateSeedTS(schema: SchemaDefinition, count: number): string {
  let ts = `// Schemakit TypeScript Seed Script\n\n`;
  ts += `import { db } from "./db";\n`; // Mock import
  
  if (schema.tables.length > 0) {
    ts += `\nasync function main() {\n`;
    ts += `  console.log("Seeding database...");\n\n`;

    for (const table of schema.tables) {
      ts += `  // Seed ${table.name}\n`;
      ts += `  const ${toCamelCase(table.name)}Data = [\n`;
      for (let i = 1; i <= count; i++) {
        ts += `    {\n`;
        for (const col of table.columns) {
          if (col.defaultValue?.includes("()")) continue;
          ts += `      ${toCamelCase(col.name)}: ${generateFakeTSValue(col, i)},\n`;
        }
        ts += `    },\n`;
      }
      ts += `  ];\n`;
      // We assume Drizzle or Prisma insert syntax
      ts += `  await db.insert(${toCamelCase(table.name)}).values(${toCamelCase(table.name)}Data);\n\n`;
    }

    ts += `  console.log("Seeding complete!");\n`;
    ts += `}\n\n`;
    ts += `main().catch(console.error);\n`;
  }

  return ts;
}

function generateFakeSQLValue(col: ColumnDefinition, index: number): string {
  if (col.type === "uuid" || col.type.includes("serial") || col.type.includes("int")) {
    return `'mock-id-${index}'`; // SQLite allows strings in int, Postgres needs casting if strict, but this is a rough mock
  }
  if (col.name.includes("email")) return `'user${index}@example.com'`;
  if (col.name.includes("name")) return `'Mock Name ${index}'`;
  if (col.type.includes("bool")) return index % 2 === 0 ? "true" : "false";
  if (col.type.includes("decimal") || col.type.includes("real")) return `${(10.5 * index).toFixed(2)}`;
  return `'Mock Data ${index}'`;
}

function generateFakeTSValue(col: ColumnDefinition, index: number): string {
  if (col.type.includes("int") || col.type.includes("serial") || col.type.includes("decimal")) return `${index}`;
  if (col.name.includes("email")) return `"user${index}@example.com"`;
  if (col.name.includes("name")) return `"Mock Name ${index}"`;
  if (col.type.includes("bool")) return index % 2 === 0 ? "true" : "false";
  return `"Mock Data ${index}"`;
}
