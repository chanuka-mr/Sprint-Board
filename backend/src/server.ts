import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import mongoose from "mongoose";
import connectDB from "./config/db";
import { getFrontendUrl } from "./config/env";
import { notFound, errorHandler } from "./middleware/error";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import taskRoutes from "./routes/taskRoutes";

const PORT: number = parseInt(process.env.PORT || "5000", 10);

const app: Express = express();

app.set("trust proxy", 1);

const allowedOrigins: string[] = [getFrontendUrl()];

const isDevLocalOrigin = (origin: string): boolean =>
  process.env.NODE_ENV !== "production" &&
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || isDevLocalOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: false,
  })
);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(mongoSanitize());

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Sprint Board API is running.",
    data: {
      name: "Sprint Board API",
      version: "1.0.0",
      endpoints: {
        auth: "/api/auth",
        users: "/api/users",
        tasks: "/api/tasks",
      },
    },
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Sprint Board API is healthy.",
    data: {
      uptime: process.uptime(),
      timestamp: Date.now(),
      dbState: mongoose.connection.readyState,
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Sprint Board API running on http://localhost:${PORT}`);
  });
};

startServer();