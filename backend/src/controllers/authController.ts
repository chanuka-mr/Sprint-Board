import { Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import User, { IUser, IUserSafe } from "../models/User";
import { AppError } from "../middleware/error";
import { AuthRequest } from "../middleware/auth";
import { getJwtSecret, getJwtExpiresIn } from "../config/env";
import { validatePasswordStrength } from "../utils/passwordPolicy";

const JWT_SECRET: string = getJwtSecret();
const JWT_EXPIRES_IN: SignOptions["expiresIn"] = getJwtExpiresIn() as SignOptions["expiresIn"];

interface LoginBody {
  email?: string;
  password?: string;
}

interface RegisterBody {
  name?: string;
  email?: string;
  password?: string;
}

const signToken = (id: string, tokenVersion: number): string => {
  return jwt.sign({ id, tv: tokenVersion }, JWT_SECRET, {
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

    if (typeof password !== "string") {
      throw new AppError("Password must be a string.", 400);
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      throw new AppError(passwordError, 400);
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

    const token = signToken(user._id.toString(), user.tokenVersion);

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

    const token = signToken(user._id.toString(), user.tokenVersion);

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