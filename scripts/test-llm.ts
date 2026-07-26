import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { generateSchemaDefinition } from "../src/services/llm";

dotenv.config();

const descriptions = [
  {
    name: "blog",
    text: "A simple blogging platform with users, posts, categories, and tags. A post can have multiple tags and one category. Users can comment on posts.",
  },
  {
    name: "project_management",
    text: "A project management tool like Trello. Workspaces contain boards. Boards contain lists. Lists contain cards. Users can be assigned to cards and leave comments on them.",
  },
  {
    name: "healthcare",
    text: "A healthcare appointment system. Patients can book appointments with doctors. Doctors have specialties and schedules. Appointments have a status (pending, confirmed, cancelled). Patients have a medical history record.",
  }
];

async function main() {
  console.log("Starting LLM tests...");
  
  if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === "your_deepseek_api_key") {
    console.error("❌ ERROR: Please set a valid DEEPSEEK_API_KEY in your .env file before running this test.");
    process.exit(1);
  }

  const fixturesDir = path.join(__dirname, "../tests/fixtures");
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  for (const desc of descriptions) {
    console.log(`\nGenerating schema for: ${desc.name}...`);
    try {
      const startTime = Date.now();
      
      const schema = await generateSchemaDefinition({
        description: desc.text,
        options: {
          database: "postgresql",
          orm: "drizzle",
          apiStyle: "rest",
          includeAuth: true,
          includeTimestamps: true,
          includeSoftDelete: false,
          seedCount: 10,
          namingConvention: "snake_case"
        }
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Success for '${desc.name}'! (Took ${duration}ms, ${schema.tables.length} tables generated)`);
      
      const filePath = path.join(fixturesDir, `${desc.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(schema, null, 2));
      console.log(`💾 Saved fixture to tests/fixtures/${desc.name}.json`);
      
    } catch (error: any) {
      console.error(`❌ Failed generating schema for '${desc.name}':`, error.message || error);
    }
  }
  
  console.log("\nAll LLM tests completed!");
}

main().catch(console.error);
