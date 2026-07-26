export interface SchemaDefinition {
  projectName: string;
  database: "postgresql" | "mysql" | "sqlite";
  tables: TableDefinition[];
  enums: EnumDefinition[];
}

export interface TableDefinition {
  name: string;                    // snake_case: "loan_positions"
  description: string;             // "Tracks individual loan positions within vaults"
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
  timestamps: boolean;             // auto-add created_at, updated_at
  softDelete: boolean;             // auto-add deleted_at
}

export interface ColumnDefinition {
  name: string;                    // snake_case: "health_factor"
  type: SQLType;                   // "varchar(255)" | "integer" | "decimal(18,8)" | etc.
  nullable: boolean;
  unique: boolean;
  primaryKey: boolean;
  defaultValue?: string;           // "now()" | "'active'" | "0" | "gen_random_uuid()"
  references?: {                   // Foreign key
    table: string;
    column: string;
    onDelete: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
  };
  check?: string;                  // CHECK constraint: "health_factor > 0"
  description: string;             // "Current health factor of the loan position"
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
  type?: "btree" | "hash" | "gin" | "gist";
}

export interface EnumDefinition {
  name: string;                    // "loan_status"
  values: string[];                // ["active", "liquidated", "repaid", "defaulted"]
}

export type SQLType =
  | "uuid"
  | "serial"
  | "bigserial"
  | "integer"
  | "bigint"
  | "smallint"
  | "boolean"
  | "varchar(255)"
  | `varchar(${number})`
  | "text"
  | `decimal(${number},${number})`
  | "real"
  | "double precision"
  | "timestamp"
  | "timestamptz"
  | "date"
  | "time"
  | "json"
  | "jsonb"
  | "bytea";
