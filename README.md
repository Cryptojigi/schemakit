# SchemaKit 🛠️

**SchemaKit (#9723)** is an AI-powered database architecture and management engine built for the OKX Agent-to-Agent (A2A) ecosystem. It provides autonomous AI agents and developers with enterprise-grade database tools accessible via OKX Onchain OS x402 micro-payments.

SchemaKit operates as an **Autonomous Service Provider (ASP)** on the OKX AI Marketplace, offering two core microservices:

1. **DB Schema & Code Generation ($2.00 USD)**: Generates complete, polyglot backend codebases (SQL DDL, Prisma/Drizzle ORMs, Zod schemas, Express routes, ER diagrams) from plain English descriptions.
2. **Database Manager ($1.00 USD)**: Acts as an AI Senior Database Administrator to execute complex schema migrations, index optimizations, realistic mock data seeding, and Natural Language to SQL queries on existing database schemas.

---

## 🌟 Key Features

### 1. Database Manager Engine (`POST /api/schema/manage`)
Runs a multi-stage deterministic orchestration pipeline under a strict 45-second timeout:
- **Schema Normalization**: Converts raw DDL (PostgreSQL, MySQL, SQLite), Prisma models, Drizzle schemas, or JSON into a unified `SchemaDefinition`.
- **4 Specialized Action Engines**:
  - `migrate`: Generates reversible `UP` and `DOWN` SQL migration scripts with automatic type-casting (`USING` clauses) and rename detection.
  - `optimize`: Analyzes column usage patterns and indexes to generate non-blocking optimization SQL.
  - `seed`: Synthesizes realistic mock data using a two-pass hybrid engine (LLM semantic generation + deterministic topological sort for foreign-key constraints).
  - `query`: Converts natural language questions into database-dialect-specific, performant SQL queries.
- **Safety & Quality Layer**: Scans generated SQL for destructive operations (`DROP TABLE`, `TRUNCATE`, `DELETE` without `WHERE`) and injects visual Markdown blockquote warnings.
- **Rich Result Composer**: Formats results into structured, developer-grade Markdown reports (`### Analysis`, `### Warnings`, `### SQL Script`, `### DOWN Migration`).

### 2. Agent-Fetched Schema (A2MCP Pattern)
- **Zero Credential Requirement**: SchemaKit **never** requests or stores database connection strings or credentials.
- **Agent as Bridge**: The calling agent (e.g., Hermes, Claude Code, OpenClaw) connects to the user's database, extracts the schema via SQL metadata queries or schema files, and supplies it as `schemaBase64`.
- **Pre-Flight Validation**: If an agent calls SchemaKit without a schema, SchemaKit's pre-flight middleware immediately returns a `SCHEMA_REQUIRED` HTTP 400 response with explicit SQL queries to fetch the schema—**before** triggering a 402 payment challenge.

### 3. Schema & Code Generation Engine (`POST /api/schema/generate`)
- Generates a full backend boilerplate as an in-memory `.zip` archive inside a Base64 JSON response payload.
- Includes SQL schema, Drizzle/Prisma models, TypeScript types, Zod validation schemas, and Express API routes.

---

## 🛠️ Architecture Pipeline

```text
Request (Action + Prompt + schemaBase64)
                   │
                   ▼
       Pre-Flight Validation
  (Returns 400 guidance if missing)
                   │
                   ▼
     OKX x402 Payment Challenge ($1.00)
                   │
                   ▼
        Schema Normalization Layer
                   │
                   ▼
            Action Engine
    (migrate | optimize | seed | query)
                   │
                   ▼
         Safety & Quality Layer
                   │
                   ▼
       Rich Result Composer (Markdown)
```

---

## 🚀 API Reference

### 1. Database Manager
- **Endpoint**: `POST /api/schema/manage`
- **Price**: $1.00 USD (EVM exact payment via OKX x402)
- **Headers**:
  - `Content-Type: application/json`
  - `x-payment-proof`: OKX x402 payment authorization header

#### Request Body
```json
{
  "action": "migrate",
  "schemaBase64": "<Base64 encoded SQL DDL or Prisma/Drizzle schema>",
  "prompt": "Add an email column to users table and make username unique"
}
```

#### Response (`200 OK`)
```json
{
  "status": "success",
  "action": "migrate",
  "result": "### Analysis\n...\n### Warnings\n...\n### SQL Script\n...",
  "metadata": {
    "tablesAffected": 1,
    "notes": "Engine execution complete"
  }
}
```

#### Schema Required Error (`400 Bad Request`)
*Returned pre-payment if `schemaBase64` is missing:*
```json
{
  "status": "error",
  "code": "SCHEMA_REQUIRED",
  "message": "No valid database schema provided.",
  "guidance": {
    "instruction": "As the calling agent, connect to the user's database and fetch the schema. Encode it as base64 and resend as schemaBase64.",
    "methods": [
      "PostgreSQL/Supabase: SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name",
      "MySQL: SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_schema = DATABASE()",
      "Alternative: Use pg_dump --schema-only, or read schema.prisma / drizzle config files"
    ]
  }
}
```

---

### 2. Schema Generator
- **Endpoint**: `POST /api/schema/generate`
- **Price**: $2.00 USD (EVM exact payment via OKX x402)
- **Request Body**:
```json
{
  "description": "E-commerce platform with products, orders, and user reviews",
  "options": {
    "database": "postgresql",
    "includeAuth": true
  }
}
```

---

## 💻 Local Development & Setup

### Prerequisites
- Node.js v18+
- npm / yarn / pnpm

### Environment Variables
Copy `.env.example` to `.env` and fill in your non-sensitive credentials:

```bash
cp .env.example .env
```

Required variables:
```env
PORT=3000
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-v4-flash
OKX_API_KEY=your_okx_api_key
OKX_SECRET_KEY=your_okx_secret_key
OKX_PASSPHRASE=your_okx_passphrase
RECEIVING_WALLET_ADDRESS=0xYourWalletAddress
CHAIN_ID=196
```

### Installation
```bash
npm install
```

### Running the Server
```bash
# Development mode with hot-reloading
npm run dev

# Production build
npm run build
npm start
```

### Test Suite
```bash
# Run unit tests via Vitest
npx vitest run
```

---

## 🔒 Security & Privacy

- **No Credential Persistence**: SchemaKit never prompts for DB credentials or stores hostnames, passwords, or connection strings.
- **Safety Scanning**: Automatic detection of destructive operations protects downstream databases from accidental data loss.
- **Input Bounds**: Strict Zod schemas and length checks prevent context window exhaustion attacks and keep latency under control.

---

## 📜 License

MIT License. Built for the OKX AI Agent Ecosystem.
