import { manageDatabaseLLM } from "../src/services/manageLLM";
import { ManageDatabaseRequestType } from "../src/types/request";
import dotenv from "dotenv";

dotenv.config();

const DUMMY_SCHEMA = JSON.stringify({
  projectName: "TestApp",
  database: "postgresql",
  tables: [
    {
      name: "users",
      columns: [
        { name: "id", type: "uuid", primaryKey: true },
        { name: "email", type: "varchar(255)", unique: true }
      ]
    },
    {
      name: "posts",
      columns: [
        { name: "id", type: "uuid", primaryKey: true },
        { name: "user_id", type: "uuid", references: { table: "users", column: "id" } },
        { name: "title", type: "varchar(255)" }
      ]
    }
  ]
});

async function runLatencyTest() {
  console.log("Starting Database Manager Latency & Quality Sweep...");
  
  const req: ManageDatabaseRequestType = {
    action: "seed",
    schemaBase64: Buffer.from(DUMMY_SCHEMA).toString("base64"),
    prompt: "Generate realistic data for 5 users and 10 posts."
  };

  const startTime = Date.now();
  try {
    const result = await manageDatabaseLLM(req);
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ Success! Executed in ${duration} seconds.`);
    console.log("--- RESULT PAYLOAD ---");
    console.log(JSON.stringify(result, null, 2));
    
    if (duration > 45) {
      console.error("❌ FAILED: Exceeded 45 second hard timeout!");
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Execution Failed:", error.message);
    process.exit(1);
  }
}

runLatencyTest();
