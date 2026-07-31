import { describe, it, expect } from "vitest";
import { normalizeSchema } from "../src/services/manage/schemaNormalizer";
import { SchemaDefinition } from "../src/types/schema";

describe("Schema Normalizer", () => {
  it("should bypass LLM completely if input is already valid SchemaDefinition JSON", async () => {
    const validSchema: SchemaDefinition = {
      projectName: "Test",
      database: "postgresql",
      tables: [
        {
          name: "users",
          columns: [{ name: "id", type: "uuid", primaryKey: true }]
        }
      ]
    };

    const rawInput = JSON.stringify(validSchema);
    
    // We mock fetch globally to ensure the LLM is NOT called
    const originalFetch = global.fetch;
    global.fetch = () => Promise.reject(new Error("LLM should not be called"));

    try {
      const result = await normalizeSchema(rawInput);
      expect(result.isFallback).toBe(false);
      expect(result.formatDetected).toBe("json");
      expect(result.schema?.projectName).toBe("Test");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("should use graceful fallback if invalid input and LLM fails", async () => {
    const rawInput = "CREATE TABLE totally_broken (";
    
    const originalFetch = global.fetch;
    global.fetch = () => Promise.reject(new Error("Simulated LLM network failure"));

    try {
      const result = await normalizeSchema(rawInput);
      expect(result.isFallback).toBe(true);
      expect(result.formatDetected).toBe("sql"); // It detects CREATE TABLE
      expect(result.originalText).toBe(rawInput);
      expect(result.schema).toBeUndefined();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
