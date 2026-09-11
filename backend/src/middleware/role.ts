import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

export const adminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Not authorized. Please log in.",
      errors: null,
    });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Access denied. Administrator privileges required.",
      errors: null,
    });
    return;
  }

  next();
};