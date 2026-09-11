import rateLimit from "express-rate-limit";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const REGISTER_MAX_ATTEMPTS = 3;

export const loginLimiter = rateLimit({
  windowMs: LOGIN_WINDOW_MS,
  max: LOGIN_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
    errors: null,
  },
});

export const registerLimiter = rateLimit({
  windowMs: REGISTER_WINDOW_MS,
  max: REGISTER_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration attempts. Please try again in an hour.",
    errors: null,
  },
});

interface FailureRecord {
  count: number;
  lockedUntil: number | null;
}

const FAILURE_LIMIT = LOGIN_MAX_ATTEMPTS;
const LOCKOUT_MS = LOGIN_WINDOW_MS;

const failures = new Map<string, FailureRecord>();

const normalizeKey = (email: string): string => email.toLowerCase();

export const getLoginLock = (email: string): { locked: boolean; remainingMs: number } => {
  const record = failures.get(normalizeKey(email));
  if (!record || !record.lockedUntil) {
    return { locked: false, remainingMs: 0 };
  }
  const remaining = record.lockedUntil - Date.now();
  if (remaining <= 0) {
    failures.delete(normalizeKey(email));
    return { locked: false, remainingMs: 0 };
  }
  return { locked: true, remainingMs: remaining };
};

export const recordLoginFailure = (email: string): { locked: boolean; retryAfterMs: number } => {
  const key = normalizeKey(email);
  const record = failures.get(key) ?? { count: 0, lockedUntil: null };
  record.count += 1;
  if (record.count >= FAILURE_LIMIT) {
    record.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  failures.set(key, record);
  return {
    locked: record.lockedUntil !== null,
    retryAfterMs: record.lockedUntil ? record.lockedUntil - Date.now() : 0,
  };
};

export const clearLoginFailures = (email: string): void => {
  failures.delete(normalizeKey(email));
};