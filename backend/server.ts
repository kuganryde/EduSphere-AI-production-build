import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import winston from "winston";
import rateLimit from "express-rate-limit";

dotenv.config();

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json({ limit: "10mb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Import routes
// import healthRoutes from "./routes/health";
// app.use("/api/health", healthRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server running on port ${PORT}`);
});
