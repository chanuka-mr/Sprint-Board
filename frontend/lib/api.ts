import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface AppUser {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt?: string;
  updatedAt?: string;
}

export interface UserReference {
  _id: string;
  name: string;
  email: string;
}

export type TaskStatus = "To Do" | "Doing" | "Done";

export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdBy: UserReference;
  assignedTo: UserReference | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string> | null;
}

export interface AuthResponse {
  token: string;
  user: AppUser;
}

export interface TasksResponse {
  tasks: Task[];
}

export interface UsersResponse {
  users: AppUser[];
}

export interface TaskResponse {
  task: Task;
}

const TOKEN_KEY = "sprint_board_token";
const USER_KEY = "sprint_board_user";

const setItem = (key: string, value: string): void => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, value);
  }
};

const getItem = (key: string): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(key);
};

const removeItem = (key: string): void => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(key);
  }
};

export const getStoredToken = (): string | null => getItem(TOKEN_KEY);

export const getStoredUser = (): AppUser | null => {
  const raw = getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AppUser;
  } catch {
    removeItem(USER_KEY);
    return null;
  }
};

export const setAuthStorage = (token: string, user: AppUser): void => {
  setItem(TOKEN_KEY, token);
  setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuthStorage = (): void => {
  removeItem(TOKEN_KEY);
  removeItem(USER_KEY);
};

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const originalRequest = error.config;
      const isAuthCall =
        originalRequest.url?.includes("/api/auth/login") ||
        originalRequest.url?.includes("/api/auth/register");

      if (!isAuthCall) {
        clearAuthStorage();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;