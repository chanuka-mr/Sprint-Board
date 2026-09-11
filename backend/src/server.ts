import express, { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db";
import { notFound, errorHandler } from "./middleware/error";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import taskRoutes from "./routes/taskRoutes";

dotenv.config();

const PORT: number = parseInt(process.env.PORT || "5000", 10);

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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