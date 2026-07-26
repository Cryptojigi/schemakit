import { describe, it, expect } from "vitest";
import { generateSQL } from "../../src/generators/sql";
import ecommerceFixture from "../fixtures/ecommerce.json";
import { SchemaDefinition } from "../../src/types/schema";

describe("SQL Generator", () => {
  it("generates valid CREATE TABLE statements for all tables", () => {
    const sql = generateSQL(ecommerceFixture as SchemaDefinition);
    expect(sql).toContain("CREATE TABLE users");
    expect(sql).toContain("CREATE TABLE orders");
  });

  it("generates proper foreign key constraints", () => {
    const sql = generateSQL(ecommerceFixture as SchemaDefinition);
    expect(sql).toContain("REFERENCES users(id)");
    expect(sql).toContain("ON DELETE CASCADE");
  });

  it("generates indexes for foreign key columns", () => {
    const sql = generateSQL(ecommerceFixture as SchemaDefinition);
    expect(sql).toContain("CREATE INDEX idx_orders_user");
  });

  it("generates enum types", () => {
    const sql = generateSQL(ecommerceFixture as SchemaDefinition);
    expect(sql).toContain("CREATE TYPE user_role AS ENUM");
  });
});
