import { Response, NextFunction } from "express";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";

export const getAllUsers = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await User.find()
      .select("_id name email role createdAt")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully.",
      data: {
        users,
      },
    });
  } catch (error) {
    next(error);
  }
};