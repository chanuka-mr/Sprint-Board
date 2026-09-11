import { Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import User, { IUser, IUserSafe } from "../models/User";
import { AppError } from "../middleware/error";
import { AuthRequest } from "../middleware/auth";

const JWT_SECRET: string = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_EXPIRES_IN: SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "7d";

interface LoginBody {
  email?: string;
  password?: string;
}

interface RegisterBody {
  name?: string;
  email?: string;
  password?: string;
}

const signToken = (id: string): string => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

const toSafeUser = (user: IUser): IUserSafe => ({
  _id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const register = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password }: RegisterBody = req.body;

    if (!name || !email || !password) {
      throw new AppError("Name, email, and password are required.", 400);
    }

    if (typeof password !== "string" || password.length < 8) {
      throw new AppError("Password must be at least 8 characters long.", 400);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError("An account with this email already exists.", 409);
    }

    const user = await User.create({
      name,
      email,
      password,
      role: "user",
    });

    const token = signToken(user._id.toString());

    res.status(201).json({
      success: true,
      message: "Registration successful.",
      data: {
        token,
        user: toSafeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password }: LoginBody = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required.", 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw new AppError("Invalid credentials. Please try again.", 401);
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      throw new AppError("Invalid credentials. Please try again.", 401);
    }

    const token = signToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        user: toSafeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError("Not authorized. Please log in.", 401);
    }

    res.status(200).json({
      success: true,
      message: "Session verified.",
      data: {
        user: toSafeUser(req.user),
      },
    });
  } catch (error) {
    next(error);
  }
};