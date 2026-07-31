import { describe, it, expect } from "vitest";
import { detectDestructiveOperations, applySafetyRules } from "../src/services/manage/safety";

describe("Safety Rules - Destructive Operation Detection", () => {
  it("should flag DROP TABLE", () => {
    const warnings = detectDestructiveOperations("DROP TABLE users;");
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("DANGER");
    expect(warnings[0]).toContain("drops one or more tables");
  });

  it("should flag DROP COLUMN", () => {
    const warnings = detectDestructiveOperations("ALTER TABLE users DROP COLUMN email;");
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("drops one or more columns");
  });

  it("should flag TRUNCATE", () => {
    const warnings = detectDestructiveOperations("TRUNCATE TABLE posts;");
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("truncates a table");
  });

  it("should flag DELETE without WHERE", () => {
    const warnings = detectDestructiveOperations("DELETE FROM users;");
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("without a WHERE clause");
  });

  it("should NOT flag DELETE with WHERE", () => {
    const warnings = detectDestructiveOperations("DELETE FROM users WHERE id = 1;");
    expect(warnings.length).toBe(0);
  });

  it("should NOT flag safe operations", () => {
    const warnings = detectDestructiveOperations("CREATE TABLE foo (id uuid);");
    expect(warnings.length).toBe(0);
  });
});

describe("applySafetyRules", () => {
  it("should merge and deduplicate warnings from UP and DOWN scripts", () => {
    const result = applySafetyRules({
      action: "migrate",
      resultString: "DROP TABLE users;",
      downScript: "DROP TABLE users;",
      warnings: ["Existing warning"]
    });

    expect(result.warnings).toBeDefined();
    expect(result.warnings?.length).toBe(3); // Existing + UP warning + DOWN warning
    expect(result.warnings).toContain("Existing warning");
    expect(result.warnings?.some(w => w.includes("drops one or more tables") && w.includes("(in DOWN script)"))).toBe(true);
  });
});
