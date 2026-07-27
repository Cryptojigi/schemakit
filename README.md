# Schemakit

An AI-powered backend architecture engine that turns natural language descriptions into fully-coded, production-ready backend systems (SQL, Drizzle ORM, Express APIs, etc.) in seconds.

Powered by **DeepSeek LLM** for intelligent generation and **OKX Onchain OS x402** for web3 micropayments.

## Features
- **DeepSeek V4 Generation**: Maps English descriptions into a strict Zod `SchemaDefinition`.
- **10 Polyglot Generators**: Automatically generates PostgreSQL, Prisma, Drizzle, Validation, Express routes, and ER diagrams.
- **x402 Micro-payments**: Native integration with the OKX SDK. Every generation request is cryptographically enforced and requires a $2.00 exact EVM payment.
- **In-Memory Zipping**: Streams the generated backend directly back to the client as a `.zip` archive inside a Base64 JSON payload.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```
   *Required:*
   - `DEEPSEEK_API_KEY`: Your DeepSeek API key
   - `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE`: OKX Facilitator credentials
   - `RECEIVING_WALLET_ADDRESS`: Where your $2.00 generation payments will be sent
   - `CHAIN_ID`: 1952 for X Layer Testnet, 196 for Mainnet.

## Development

Start the server:
```bash
npm run dev
```

Run LLM generation tests (bypasses Express/x402 to test DeepSeek directly):
```bash
npm run test:llm
```

## API Endpoint

**`POST /api/schema/generate`**

*Headers Required:*
- `Authorization`: Your OKX x402 payment proof.

*Body:*
```json
{
  "description": "A healthcare appointment booking app",
  "options": {
    "database": "postgresql",
    "includeAuth": true
  }
}
```

*Response:*
Returns a JSON envelope with `success`, execution statistics, and a `fileData` Base64 string containing the complete `.zip` archive of your new backend.
