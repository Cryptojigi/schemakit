import { SchemaDefinition } from "../types/schema";
import YAML from "yaml";
import { toCamelCase, toPascalCase } from "../utils/naming";

export function generateOpenAPI(schema: SchemaDefinition): string {
  const spec: any = {
    openapi: "3.0.3",
    info: {
      title: `${schema.projectName} API`,
      version: "1.0.0",
      description: "Auto-generated REST API by Schemakit"
    },
    paths: {},
    components: {
      schemas: {}
    }
  };

  for (const table of schema.tables) {
    const namePascal = toPascalCase(table.name);
    const routeBase = `/${table.name.replace(/_/g, "-")}`;
    
    // Schema definition
    const properties: any = {};
    for (const col of table.columns) {
      properties[toCamelCase(col.name)] = {
        type: mapTypeToOpenAPI(col.type),
        description: col.description || undefined
      };
    }
    
    if (table.timestamps) {
      properties.createdAt = { type: "string", format: "date-time" };
      properties.updatedAt = { type: "string", format: "date-time" };
    }
    if (table.softDelete) {
      properties.deletedAt = { type: "string", format: "date-time" };
    }

    spec.components.schemas[namePascal] = {
      type: "object",
      properties
    };

    // Paths
    spec.paths[routeBase] = {
      get: {
        summary: `List ${table.name}`,
        tags: [namePascal],
        responses: {
          "200": {
            description: "A list of records",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: `#/components/schemas/${namePascal}` } }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: `Create ${table.name}`,
        tags: [namePascal],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${namePascal}` } // simplification for create
            }
          }
        },
        responses: {
          "201": {
            description: "Created record",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: `#/components/schemas/${namePascal}` } }
                }
              }
            }
          }
        }
      }
    };

    spec.paths[`${routeBase}/{id}`] = {
      get: {
        summary: `Get ${table.name} by ID`,
        tags: [namePascal],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Single record",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: `#/components/schemas/${namePascal}` } }
                }
              }
            }
          }
        }
      },
      patch: {
        summary: `Update ${table.name}`,
        tags: [namePascal],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${namePascal}` }
            }
          }
        },
        responses: {
          "200": {
            description: "Updated record"
          }
        }
      },
      delete: {
        summary: `Delete ${table.name}`,
        tags: [namePascal],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "204": { description: "Deleted" }
        }
      }
    };
  }

  return YAML.stringify(spec);
}

function mapTypeToOpenAPI(sqlType: string): string {
  if (sqlType.includes("int") || sqlType.includes("serial")) return "integer";
  if (sqlType.includes("decimal") || sqlType.includes("real")) return "number";
  if (sqlType.includes("bool")) return "boolean";
  return "string";
}
