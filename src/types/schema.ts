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
  primaryKey: z.boolean().nullable().optional(),
  nullable: z.boolean().nullable().optional(),
  unique: z.boolean().nullable().optional(),
  defaultValue: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  references: z.object({
    table: z.string(),
    column: z.string(),
    onDelete: z.string().nullable().optional()
  }).nullable().optional()
});

export const TableDefinitionSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  timestamps: z.boolean().nullable().optional(),
  softDelete: z.boolean().nullable().optional(),
  columns: z.array(ColumnDefinitionSchema),
  indexes: z.array(z.object({
    name: z.string(),
    columns: z.array(z.string()),
    unique: z.boolean().nullable().optional()
  })).nullable().optional()
});

export const SchemaDefinitionSchema = z.object({
  projectName: z.string().default("Project"),
  database: z.string().default("postgresql"),
  tables: z.array(TableDefinitionSchema),
  enums: z.array(z.object({
    name: z.string(),
    values: z.array(z.string())
  })).nullable().optional()
});
