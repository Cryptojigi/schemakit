# Agent Guide: Fetching Database Schemas

When calling SchemaKit's Database Manager (`POST /api/schema/manage`), you **must** provide the user's database schema as a base64-encoded string (`schemaBase64`). SchemaKit does not connect to the user's database directly. **You (the calling agent) are the bridge.**

Here is how you can fetch the schema from various database systems before calling SchemaKit.

---

## 1. PostgreSQL / Supabase

Run the following SQL query to extract the table and column definitions:

```sql
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
ORDER BY 
    table_name, 
    ordinal_position;
```

Alternatively, if you have access to the CLI:
```bash
pg_dump -s -x -O -h <host> -U <user> -d <dbname>
```

---

## 2. MySQL

Run the following SQL query:

```sql
SELECT 
    TABLE_NAME, 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM 
    information_schema.columns 
WHERE 
    table_schema = DATABASE()
ORDER BY 
    TABLE_NAME, 
    ORDINAL_POSITION;
```

Alternatively, if you have access to the CLI:
```bash
mysqldump -d -h <host> -u <user> -p<password> <dbname>
```

---

## 3. SQLite

If you have access to the sqlite3 CLI, simply run:
```bash
sqlite3 database.db ".schema"
```

---

## 4. Using ORM Config Files

If the user project uses Prisma or Drizzle, you can simply read the schema file from the filesystem.

**Prisma:**
Read the `schema.prisma` file (usually in `/prisma/schema.prisma`).

**Drizzle:**
Read the `schema.ts` file (usually in `/src/db/schema.ts` or `/src/schema.ts`).

---

## 5. Encoding the Payload

Once you have the schema as text (from any of the methods above), encode it in Base64 before putting it in your JSON request.

**Node.js Example:**
```typescript
const schemaBase64 = Buffer.from(schemaText).toString("base64");

const payload = {
  action: "query", // or "migrate", "optimize", "seed"
  schemaBase64: schemaBase64,
  prompt: "Find all users who signed up last week"
};
```
