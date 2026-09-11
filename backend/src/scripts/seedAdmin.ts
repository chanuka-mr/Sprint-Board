import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/db";
import User from "../models/User";

dotenv.config();

const ADMIN_EMAIL = "admin@lesstaxi.com";
const ADMIN_PASSWORD = "Admin@123456";
const ADMIN_NAME = "Sprint Board Admin";

const seedAdmin = async (): Promise<void> => {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB();

    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });

    if (existingAdmin) {
      console.log(
        `[SKIP] Admin user already exists (${ADMIN_EMAIL}). Resetting password to match seed spec...`
      );

      if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        console.log("[UPDATE] Upgraded existing user role to 'admin'.");
      }

      existingAdmin.password = ADMIN_PASSWORD;
      await existingAdmin.save();
      console.log("[DONE] Admin credentials provisioned.");
    } else {
      const admin = await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: "admin",
      });
      console.log(
        `[CREATED] Admin user created: ${ADMIN_EMAIL} (id: ${admin._id.toString()})`
      );
    }

    console.log("\nSeed completed successfully.");
    console.log("\n=============================================");
    console.log("Sprint Board - Administrator Credentials");
    console.log("=============================================");
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log("=============================================\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seed script failed:", error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  }
};

seedAdmin();