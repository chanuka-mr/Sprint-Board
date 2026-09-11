import { Router } from "express";
import { register, login, getMe } from "../controllers/authController";
import { protect } from "../middleware/auth";
import { registerLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/register", registerLimiter, register);
router.post("/login", login);
router.get("/me", protect, getMe);

export default router;