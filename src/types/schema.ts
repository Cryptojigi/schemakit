import { z } from "zod";

export interface SchemaDefinition {
  projectName: string;
  database: "postgresql" | "mysql" | "sqlite";
  tables: TableDefinition[];
  enums?: EnumDefinition[];
}

export interface TableDefinition {
  name: string;
  description?: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
  timestamps?: boolean;
  softDelete?: boolean;
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  unique?: boolean;
  primaryKey?: boolean;
  defaultValue?: string;
  references?: {
    table: string;
    column: string;
    onDelete?: string;
  };
  check?: string;
  description?: string;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
  type?: string;
}

export interface EnumDefinition {
  name: string;
  values: string[];
}

export const ColumnDefinitionSchema = z.object({
  name: z.string(),
  type: z.string(),
  primaryKey: z.boolean().optional(),
  nullable: z.boolean().optional(),
  unique: z.boolean().optional(),
  defaultValue: z.string().optional(),
  description: z.string().optional(),
  references: z.object({
    table: z.string(),
    column: z.string(),
    onDelete: z.string().optional()
  }).optional()
});

export const TableDefinitionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  timestamps: z.boolean().optional(),
  softDelete: z.boolean().optional(),
  columns: z.array(ColumnDefinitionSchema),
  indexes: z.array(z.object({
    name: z.string(),
    columns: z.array(z.string()),
    unique: z.boolean().optional()
  })).optional()
});

export const SchemaDefinitionSchema = z.object({
  projectName: z.string(),
  database: z.string(),
  tables: z.array(TableDefinitionSchema),
  enums: z.array(z.object({
    name: z.string(),
    values: z.array(z.string())
  })).optional()
});
