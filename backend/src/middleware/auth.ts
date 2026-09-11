import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User, { IUser } from "../models/User";
import { getJwtSecret } from "../config/env";

const JWT_SECRET: string = getJwtSecret();

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Not authorized. No token provided.",
        errors: null,
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (err) {
      const message =
        err instanceof jwt.TokenExpiredError
          ? "Session expired. Please log in again."
          : "Invalid token. Please log in again.";
      res.status(401).json({
        success: false,
        message,
        errors: null,
      });
      return;
    }

    if (!decoded.id) {
      res.status(401).json({
        success: false,
        message: "Invalid token payload. Please log in again.",
        errors: null,
      });
      return;
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User belonging to this token no longer exists.",
        errors: null,
      });
      return;
    }

    if (decoded.tv !== user.tokenVersion) {
      res.status(401).json({
        success: false,
        message: "Session is no longer valid. Please log in again.",
        errors: null,
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export default protect;