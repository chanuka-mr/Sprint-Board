import dotenv from "dotenv";

dotenv.config();

const isProduction = (): boolean => process.env.NODE_ENV === "production";

const requiredInProduction = (name: string, fallback: string): string => {
  const value = process.env[name];
  if (isProduction() && !value) {
    throw new Error(`Environment variable ${name} must be set in production.`);
  }
  return value || fallback;
};

export const getJwtSecret = (): string =>
  requiredInProduction("JWT_SECRET", "dev_secret_change_me");

export const getJwtExpiresIn = (): string =>
  requiredInProduction("JWT_EXPIRES_IN", "7d");

export const getMongoUri = (): string =>
  requiredInProduction(
    "MONGODB_URI",
    "mongodb://localhost:27017/sprint-board"
  );

export const getFrontendUrl = (): string =>
  requiredInProduction("FRONTEND_URL", "http://localhost:3000");