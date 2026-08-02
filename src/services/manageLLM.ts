import { ManageDatabaseRequestType, ManageDatabaseResponseType, ManageDatabaseResponseSchema } from "../types/request";
import pino from "pino";
import { normalizeSchema } from "./manage/schemaNormalizer";
import { migrateEngine, optimizeEngine, queryEngine, seedEngine } from "./manage/actionEngines";
import { applySafetyRules } from "./manage/safety";
import { composeRichResult } from "./manage/resultComposer";
import { EngineContext, EngineResult } from "./manage/types";
import { SchemaRequiredError } from "../utils/errors";

const logger = pino();

export async function manageDatabaseLLM(request: ManageDatabaseRequestType): Promise<ManageDatabaseResponseType> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  // Wrap the entire orchestration in a hard 45-second timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Database Manager timed out after 45 seconds.")), 45000);
  });

  return Promise.race([
    executeManageFlow(request),
    timeoutPromise
  ]);
}

async function executeManageFlow(request: ManageDatabaseRequestType): Promise<ManageDatabaseResponseType> {
  // 1. Decode schema & validate size
  const schemaText = Buffer.from(request.schemaBase64, "base64").toString("utf-8");
  
  if (schemaText.length > 100000) {
    throw new Error("Schema is too large. Maximum supported size is ~100k characters.");
  }
  if (schemaText.length < 10) {
    throw new SchemaRequiredError("Decoded schema is empty or too short.");
  }

  // 2. Schema Normalization (LLM Call 1 - if needed)
  logger.info({ msg: "Starting schema normalization" });
  const normalized = await normalizeSchema(schemaText);
  
  const context: EngineContext = { request, normalized };
  let engineResult: EngineResult;

  // 3. Route to specific engine (LLM Call 2)
  logger.info({ msg: "Routing to action engine", action: request.action });
  try {
    switch (request.action) {
      case "migrate":
        engineResult = await migrateEngine(context);
        break;
      case "optimize":
        engineResult = await optimizeEngine(context);
        break;
      case "seed":
        engineResult = await seedEngine(context);
        break;
      case "query":
        engineResult = await queryEngine(context);
        break;
      default:
        throw new Error(`Unsupported action: ${request.action}`);
    }
  } catch (error: any) {
    // 4. Optional Refinement/Retry (LLM Call 3)
    logger.warn({ msg: "Engine failed, attempting one fallback retry", error: error.message });
    // In a real retry we would pass the error back to the engine. For now, we simply re-invoke.
    switch (request.action) {
      case "migrate": engineResult = await migrateEngine(context); break;
      case "optimize": engineResult = await optimizeEngine(context); break;
      case "seed": engineResult = await seedEngine(context); break;
      case "query": engineResult = await queryEngine(context); break;
      default: throw new Error(`Unsupported action: ${request.action}`);
    }
  }

  // 5. Safety & Quality Layer
  engineResult = applySafetyRules(engineResult);

  // 6. Result Composer
  const richResult = composeRichResult(engineResult);

  // 7. Format exact public response
  const responsePayload = {
    status: "success",
    action: request.action,
    result: richResult,
    metadata: {
      tablesAffected: engineResult.tablesAffected || 0,
      notes: "Engine execution complete"
    }
  };

  // 8. Strict Zod contract validation
  return ManageDatabaseResponseSchema.parse(responsePayload);
}
