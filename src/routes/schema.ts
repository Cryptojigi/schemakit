import { Router, Request, Response, NextFunction } from "express";
import { GenerateSchemaRequest } from "../types/request";
import { orchestrateGeneration } from "../services/orchestrator";
import pino from "pino";
import { paymentMiddleware, x402ResourceServer } from '@okxweb3/x402-express';
import { ExactEvmScheme } from '@okxweb3/x402-evm/exact/server';
import { OKXFacilitatorClient } from '@okxweb3/x402-core';

const logger = pino();
const router = Router();

const NETWORK = `eip155:${process.env.CHAIN_ID || '196'}`;
const PAY_TO = process.env.RECEIVING_WALLET_ADDRESS || '';

// 1. Facilitator
const facilitatorClient = new OKXFacilitatorClient({
  apiKey: process.env.OKX_API_KEY || '',
  secretKey: process.env.OKX_SECRET_KEY || '',
  passphrase: process.env.OKX_PASSPHRASE || '',
});

// 2. Resource Server
const resourceServer = new x402ResourceServer(facilitatorClient);
resourceServer.register(NETWORK as `${string}:${string}`, new ExactEvmScheme());

// 3. Define paid routes (Exact match for Express router paths)
const paymentConfig: Record<string, any> = {
  // Always register both GET and POST
  'GET /': {
    accepts: [{
      scheme: 'exact',
      network: NETWORK,
      payTo: PAY_TO,
      price: '$2.00',          // Schemakit costs $2 USD
    }],
    description: 'Schemakit Backend Generation',
    mimeType: 'application/json',
  },
  'POST /': {
    accepts: [{
      scheme: 'exact',
      network: NETWORK,
      payTo: PAY_TO,
      price: '$2.00',
    }],
    description: 'Schemakit Backend Generation',
    mimeType: 'application/json',
  },
};

// 4. Apply the middleware to all routes in this router
router.use(paymentMiddleware(paymentConfig, resourceServer));

// 5. Endpoint: GET /api/schema/generate (Dummy endpoint for OKX scanner)
router.get("/", (req: Request, res: Response) => {
  res.json({ status: "ready", message: "Schemakit API is ready for POST requests." });
});

// 6. Endpoint: POST /api/schema/generate
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  try {
    // 1. Validate request body
    const validated = GenerateSchemaRequest.parse(req.body);
    
    // 2. Orchestrate generation
    logger.info({ msg: "Starting generation", options: validated.options });
    const { zipBuffer, stats } = await orchestrateGeneration(validated);
    
    const duration = Date.now() - startTime;
    logger.info({ msg: "Generation complete", durationMs: duration, stats });

    const filename = `schemakit-${validated.description.slice(0, 15).replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.zip`;
    
    // Return base64 JSON payload for A2MCP compatibility matching Forma schema
    res.json({
      status: "success",
      fileName: filename,
      metadata: stats,
      fileData: zipBuffer.toString("base64")
    });
  } catch (error) {
    next(error);
  }
});

export default router;
