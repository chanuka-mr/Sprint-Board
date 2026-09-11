import { Router } from "express";
import { getAllUsers } from "../controllers/userController";
import { protect } from "../middleware/auth";
import { adminOnly } from "../middleware/role";

const router = Router();

router.get("/", protect, adminOnly, getAllUsers);

export default router;