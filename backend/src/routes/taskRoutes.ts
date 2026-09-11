import { Router } from "express";
import {
  getTasks,
  createTask,
  updateTaskStatus,
  assignTask,
  updateTask,
  deleteTask,
} from "../controllers/taskController";
import { protect } from "../middleware/auth";

const router = Router();

router.use(protect);

router.route("/").get(getTasks).post(createTask);
router.patch("/:id/status", updateTaskStatus);
router.patch("/:id/assign", assignTask);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);

export default router;