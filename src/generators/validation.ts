import { SchemaDefinition } from "../types/schema";
import { toCamelCase, toPascalCase } from "../utils/naming";

export function generateValidation(schema: SchemaDefinition): string {
  let ts = `import { z } from "zod";\n\n`;

  for (const table of schema.tables) {
    const NamePascal = toPascalCase(table.name);

    ts += `export const Create${NamePascal}Schema = z.object({\n`;
    for (const col of table.columns) {
      if (col.primaryKey || col.name === "created_at" || col.name === "updated_at" || col.name === "deleted_at") continue;
      
      let zType = "z.string()";
      if (col.type.includes("int") || col.type.includes("serial") || col.type.includes("decimal")) zType = "z.number()";
      if (col.type.includes("bool")) zType = "z.boolean()";
      if (col.type.includes("json")) zType = "z.any()";

      if (col.nullable) zType += ".optional().nullable()";
      else if (col.defaultValue) zType += ".optional()";
      
      if (col.name.includes("email")) zType += ".email()";

      ts += `  ${toCamelCase(col.name)}: ${zType},\n`;
    }
    ts += `});\n\n`;

    ts += `export const Update${NamePascal}Schema = Create${NamePascal}Schema.partial();\n\n`;
  }

  return ts;
}
