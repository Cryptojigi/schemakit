import { Router, Request, Response, NextFunction } from "express";
import { ManageDatabaseRequest } from "../types/request";
import { manageDatabaseLLM } from "../services/manageLLM";
import pino from "pino";
import { paymentMiddleware, x402ResourceServer } from '@okxweb3/x402-express';
import { ExactEvmScheme } from '@okxweb3/x402-evm/exact/server';
import { OKXFacilitatorClient } from '@okxweb3/x402-core';

const logger = pino();
const router = Router();

const NETWORK = `eip155:${process.env.CHAIN_ID || '1952'}`;
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
      price: '$1.00',          // Database Manager costs $1 USD
    }],
    description: 'Schemakit Database Manager',
    mimeType: 'application/json',
  },
  'POST /': {
    accepts: [{
      scheme: 'exact',
      network: NETWORK,
      payTo: PAY_TO,
      price: '$1.00',
    }],
    description: 'Schemakit Database Manager',
    mimeType: 'application/json',
  },
};

// 4. Apply the middleware to all routes in this router
router.use(paymentMiddleware(paymentConfig, resourceServer));

// 5. Endpoint: GET / (Dummy endpoint for OKX scanner)
router.get("/", (req: Request, res: Response) => {
  res.json({ status: "ready", message: "Schemakit Database Manager API is ready for POST requests." });
});

// 6. Endpoint: POST /
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Validate request body
    const validated = ManageDatabaseRequest.parse(req.body);
    
    // 2. Process via LLM
    logger.info({ msg: "Starting database management action", action: validated.action });
    const responseData = await manageDatabaseLLM(validated);
    
    // 3. Return the response
    res.json(responseData);
  } catch (error) {
    next(error);
  }
});

export default router;
