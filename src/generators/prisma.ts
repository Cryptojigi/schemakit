import { SchemaDefinition } from "../types/schema";
import { toCamelCase, toPascalCase } from "../utils/naming";

export function generatePrisma(schema: SchemaDefinition): string {
  let prisma = `// Schemakit Generated Prisma Schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${schema.database}"
  url      = env("DATABASE_URL")
}

`;

  // Enums
  for (const enm of schema.enums) {
    prisma += `enum ${toPascalCase(enm.name)} {\n`;
    for (const val of enm.values) {
      prisma += `  ${val}\n`;
    }
    prisma += `}\n\n`;
  }

  // Models
  for (const table of schema.tables) {
    if (table.description) {
      prisma += `/// ${table.description}\n`;
    }
    prisma += `model ${toPascalCase(table.name)} {\n`;

    for (const col of table.columns) {
      let type = mapSQLTypeToPrisma(col.type, schema.enums);
      if (col.nullable && !col.primaryKey) type += "?";
      
      let attributes = "";
      if (col.primaryKey) {
        if (col.type === "uuid" && col.defaultValue?.includes("uuid")) {
          attributes = `@id @default(uuid())`;
        } else if (col.type.includes("serial")) {
          attributes = `@id @default(autoincrement())`;
        } else {
          attributes = `@id`;
        }
      } else if (col.unique) {
        attributes = `@unique`;
      }

      if (col.defaultValue && !col.primaryKey) {
        if (col.defaultValue.includes("now()")) {
          attributes += ` @default(now())`;
        } else {
          attributes += ` @default(${col.defaultValue})`;
        }
      }

      prisma += `  ${toCamelCase(col.name)} ${type.padEnd(20)} ${attributes}\n`;
    }

    if (table.timestamps) {
      prisma += `  createdAt            DateTime             @default(now()) @map("created_at")\n`;
      prisma += `  updatedAt            DateTime             @updatedAt @map("updated_at")\n`;
    }
    if (table.softDelete) {
      prisma += `  deletedAt            DateTime?            @map("deleted_at")\n`;
    }

    prisma += `\n  @@map("${table.name}")\n`;
    prisma += `}\n\n`;
  }

  return prisma;
}

function mapSQLTypeToPrisma(sqlType: string, enums: any[]): string {
  if (enums.some((e) => e.name === sqlType)) return toPascalCase(sqlType);
  if (sqlType.includes("varchar") || sqlType.includes("text")) return "String";
  if (sqlType.includes("int") || sqlType.includes("serial")) return "Int";
  if (sqlType.includes("decimal") || sqlType.includes("numeric")) return "Decimal";
  if (sqlType.includes("real") || sqlType.includes("double")) return "Float";
  if (sqlType.includes("bool")) return "Boolean";
  if (sqlType.includes("timestamp") || sqlType.includes("date")) return "DateTime";
  if (sqlType.includes("json")) return "Json";
  return "String";
}
