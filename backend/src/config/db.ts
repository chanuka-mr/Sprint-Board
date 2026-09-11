import mongoose from "mongoose";
import dotenv from "dotenv";
import dns, { promises as dnsPromises } from "dns";

dotenv.config();

const MONGODB_URI: string =
  process.env.MONGODB_URI || "mongodb://localhost:27017/sprint-board";

const FALLBACK_DNS_SERVERS = ["1.1.1.1", "8.8.8.8", "2001:4860:4860::8888"];

const getSRVHost = (uri: string): string | null => {
  if (!uri.startsWith("mongodb+srv://")) {
    return null;
  }
  const match = uri.match(/^mongodb\+srv:\/\/[^@/]+@([^/?#]+)/);
  return match ? match[1] : null;
};

const getResolveErrorCode = (error: unknown): string => {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code: unknown }).code)
    : "UNKNOWN";
};

const ensureSRVAvailability = async (uri: string): Promise<void> => {
  const host = getSRVHost(uri);
  if (!host) {
    return;
  }

  try {
    await dnsPromises.resolveSrv(`_mongodb._tcp.${host}`);
    return;
  } catch (error) {
    console.warn(
      `[DNS] SRV lookup for "${host}" failed via system resolver ` +
        `(${getResolveErrorCode(error)}). Falling back to public resolvers ` +
        `(${FALLBACK_DNS_SERVERS.join(", ")}).`
    );
  }

  dns.setServers(FALLBACK_DNS_SERVERS);

  try {
    await dnsPromises.resolveSrv(`_mongodb._tcp.${host}`);
    console.log(`[DNS] SRV lookup for "${host}" succeeded via fallback resolvers.`);
  } catch (error) {
    console.error(
      `[DNS] SRV lookup for "${host}" also failed via fallback resolvers ` +
        `(${getResolveErrorCode(error)}).`
    );
  }
};

let isConnected = false;

const connectDB = async (): Promise<void> => {
  if (isConnected) {
    console.log("MongoDB already connected. Using existing connection.");
    return;
  }

  try {
    await ensureSRVAvailability(MONGODB_URI);

    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    isConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected. Attempting to reconnect...");
      isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected.");
      isConnected = true;
    });

    mongoose.connection.on("error", (err) => {
      console.error(`MongoDB connection error: ${err.message}`);
      isConnected = false;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown MongoDB error";
    console.error(`MongoDB connection failed: ${message}`);
    console.error("Retrying in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

export default connectDB;