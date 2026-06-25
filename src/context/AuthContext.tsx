"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface User {
  id: number;
  userId: string;
  email: string;
  fullName: string;
  provider: string;
  kotakApiSaved?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  kotakApiSaved: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  register: (data: { userId: string; email: string; password: string; fullName: string; broker: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  saveKotakApi: (keys: { consumerKey: string; consumerSecret: string; mpin: string }) => Promise<{ success: boolean; error?: string }>;
  getApiBaseUrl: () => string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) return process.env.NEXT_PUBLIC_BACKEND_URL;
  if (typeof window === "undefined") return "http://localhost:3001";
  return `http://${window.location.hostname}:3001`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [kotakApiSaved, setKotakApiSaved] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem("pfno_token");
    const storedUser = localStorage.getItem("pfno_user");
    if (stored && storedUser) {
      setToken(stored);
      try {
        const u = JSON.parse(storedUser);
        setUser(u);
        setKotakApiSaved(!!u.kotakApiSaved);
      } catch {
        localStorage.removeItem("pfno_token");
        localStorage.removeItem("pfno_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Login failed" };

      setToken(data.token);
      setUser(data.user);
      setKotakApiSaved(!!data.user.kotakApiSaved);
      localStorage.setItem("pfno_token", data.token);
      localStorage.setItem("pfno_user", JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      const { auth } = await import("../lib/firebase");
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      const idToken = await userCred.user.getIdToken();

      const res = await fetch(`${getApiBaseUrl()}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken, fullName: userCred.user.displayName, email: userCred.user.email }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Google login failed" };

      setToken(data.token);
      setUser(data.user);
      setKotakApiSaved(!!data.user.kotakApiSaved);
      localStorage.setItem("pfno_token", data.token);
      localStorage.setItem("pfno_user", JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message || "Google login failed" };
    }
  }, []);

  const register = useCallback(async (data: { userId: string; email: string; password: string; fullName: string; broker: string }) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) return { success: false, error: result.error || "Registration failed" };

      setToken(result.token);
      setUser(result.user);
      setKotakApiSaved(false);
      localStorage.setItem("pfno_token", result.token);
      localStorage.setItem("pfno_user", JSON.stringify(result.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setKotakApiSaved(false);
    localStorage.removeItem("pfno_token");
    localStorage.removeItem("pfno_user");
  }, []);

  const saveKotakApi = useCallback(async (keys: { consumerKey: string; consumerSecret: string; mpin: string }) => {
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/kotak-api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(keys),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Failed to save" };

      setKotakApiSaved(true);
      const updatedUser = { ...user!, kotakApiSaved: true };
      setUser(updatedUser);
      localStorage.setItem("pfno_user", JSON.stringify(updatedUser));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  }, [token, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        kotakApiSaved,
        login,
        loginWithGoogle,
        register,
        logout,
        saveKotakApi,
        getApiBaseUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
