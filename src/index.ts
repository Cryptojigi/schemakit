import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino";
import dotenv from "dotenv";

import schemaRoutes from "./routes/schema";
import manageRoutes from "./routes/manage";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
const logger = pino();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);



app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/schema/health", (req: express.Request, res: express.Response) => {
  res.json({ status: "ok", service: "schemakit" });
});



// Main routers
app.use("/api/schema/generate", schemaRoutes);
app.use("/api/schema/manage", manageRoutes);

// Global Error Handler
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`Schemakit server listening on port ${port}`);
});
