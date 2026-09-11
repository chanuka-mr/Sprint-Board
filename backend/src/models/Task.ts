import mongoose, { Schema, Document, Model } from "mongoose";
import { IUser } from "./User";

export const TASK_STATUSES = ["To Do", "Doing", "Done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface ITask extends Document {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdBy: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserReference {
  _id: string;
  name: string;
  email: string;
}

export interface ITaskPopulated extends Omit<ITask, "createdBy" | "assignedTo"> {
  createdBy: IUserReference;
  assignedTo: IUserReference | null;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    status: {
      type: String,
      enum: {
        values: TASK_STATUSES,
        message: "{VALUE} is not a valid status",
      },
      default: "To Do",
    },
    priority: {
      type: String,
      enum: {
        values: TASK_PRIORITIES,
        message: "{VALUE} is not a valid priority",
      },
      default: "medium",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy is required"],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ status: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ createdBy: 1 });

const Task: Model<ITask> = mongoose.model<ITask>("Task", taskSchema);

export default Task;