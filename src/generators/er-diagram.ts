import { SchemaDefinition } from "../types/schema";

export function generateERDiagram(schema: SchemaDefinition): string {
  let mermaid = `erDiagram\n`;

  for (const table of schema.tables) {
    mermaid += `  ${table.name} {\n`;
    for (const col of table.columns) {
      let modifiers = "";
      if (col.primaryKey) modifiers += " PK";
      if (col.references) modifiers += " FK";
      
      const typeStr = col.type.replace(/[\(\)]/g, "_"); // Mermaid doesn't like parentheses in types sometimes
      mermaid += `    ${typeStr} ${col.name}${modifiers}\n`;
    }
    mermaid += `  }\n\n`;
  }

  // Relations
  for (const table of schema.tables) {
    for (const col of table.columns) {
      if (col.references) {
        // Simple many-to-one or one-to-one representation
        // syntax: parent ||--o{ child : "description"
        const unique = col.unique ? "||--||" : "||--o{";
        mermaid += `  ${col.references.table} ${unique} ${table.name} : "references ${col.references.column}"\n`;
      }
    }
  }

  return mermaid;
}
