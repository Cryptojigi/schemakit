import { SchemaDefinition } from "../types/schema";
import { toCamelCase, toPascalCase } from "../utils/naming";

export function generateRoutes(schema: SchemaDefinition): string {
  let ts = `import { Router, Request, Response } from "express";\n`;
  ts += `import { db } from "../db"; // Mock database import\n\n`;
  ts += `const router = Router();\n\n`;

  for (const table of schema.tables) {
    const routeBase = `/${table.name.replace(/_/g, "-")}`;
    const nameCamel = toCamelCase(table.name);
    const NamePascal = toPascalCase(table.name);
    
    ts += `// ==========================================\n`;
    ts += `// Routes for ${table.name}\n`;
    ts += `// ==========================================\n\n`;

    // List
    ts += `router.get("${routeBase}", async (req: Request, res: Response) => {\n`;
    ts += `  try {\n`;
    ts += `    // const data = await db.select().from(${nameCamel});\n`;
    ts += `    res.json({ data: [] });\n`;
    ts += `  } catch (error) {\n`;
    ts += `    res.status(500).json({ error: "Internal Server Error" });\n`;
    ts += `  }\n`;
    ts += `});\n\n`;

    // Get One
    ts += `router.get("${routeBase}/:id", async (req: Request, res: Response) => {\n`;
    ts += `  try {\n`;
    ts += `    res.json({ data: { id: req.params.id } });\n`;
    ts += `  } catch (error) {\n`;
    ts += `    res.status(500).json({ error: "Internal Server Error" });\n`;
    ts += `  }\n`;
    ts += `});\n\n`;

    // Create
    ts += `router.post("${routeBase}", async (req: Request, res: Response) => {\n`;
    ts += `  try {\n`;
    ts += `    res.status(201).json({ data: req.body });\n`;
    ts += `  } catch (error) {\n`;
    ts += `    res.status(500).json({ error: "Internal Server Error" });\n`;
    ts += `  }\n`;
    ts += `});\n\n`;

    // Update
    ts += `router.patch("${routeBase}/:id", async (req: Request, res: Response) => {\n`;
    ts += `  try {\n`;
    ts += `    res.json({ data: { id: req.params.id, ...req.body } });\n`;
    ts += `  } catch (error) {\n`;
    ts += `    res.status(500).json({ error: "Internal Server Error" });\n`;
    ts += `  }\n`;
    ts += `});\n\n`;

    // Delete
    ts += `router.delete("${routeBase}/:id", async (req: Request, res: Response) => {\n`;
    ts += `  try {\n`;
    ts += `    res.status(204).send();\n`;
    ts += `  } catch (error) {\n`;
    ts += `    res.status(500).json({ error: "Internal Server Error" });\n`;
    ts += `  }\n`;
    ts += `});\n\n`;
  }

  ts += `export default router;\n`;
  return ts;
}
