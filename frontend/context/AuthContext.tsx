"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import apiClient, {
  AppUser,
  AuthResponse,
  ApiResponse,
  getStoredUser,
  getStoredToken,
  setAuthStorage,
  clearAuthStorage,
} from "../lib/api";

interface AuthContextType {
  user: AppUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<AppUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Start with null to match the server render, then hydrate from localStorage
  // in an effect so hydration never mismatches.
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setUser(getStoredUser());
    setToken(getStoredToken());
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        "/api/auth/login",
        { email, password }
      );

      const { token: newToken, user: newUser } = response.data.data;
      setAuthStorage(newToken, newUser);
      setToken(newToken);
      setUser(newUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setIsLoading(true);
      try {
        const response = await apiClient.post<ApiResponse<AuthResponse>>(
          "/api/auth/register",
          { name, email, password }
        );

        const { token: newToken, user: newUser } = response.data.data;
        setAuthStorage(newToken, newUser);
        setToken(newToken);
        setUser(newUser);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async (): Promise<AppUser | null> => {
    try {
      const response = await apiClient.get<ApiResponse<{ user: AppUser }>>(
        "/api/auth/me"
      );
      const freshUser = response.data.data.user;
      setUser(freshUser);
      const storedToken = getStoredToken();
      if (storedToken) {
        setAuthStorage(storedToken, freshUser);
      }
      return freshUser;
    } catch {
      logout();
      return null;
    }
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};