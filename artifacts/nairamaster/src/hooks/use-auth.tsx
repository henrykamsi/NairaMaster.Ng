import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "@workspace/api-client-react";

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("nm_token"));
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("nm_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setAuth = (newToken: string, newUser: User) => {
    localStorage.setItem("nm_token", newToken);
    localStorage.setItem("nm_user", JSON.stringify(newUser));
    setTokenState(newToken);
    setUserState(newUser);
  };

  const updateUser = (newUser: User) => {
    localStorage.setItem("nm_user", JSON.stringify(newUser));
    setUserState(newUser);
  };

  const logout = () => {
    localStorage.removeItem("nm_token");
    localStorage.removeItem("nm_user");
    setTokenState(null);
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, setAuth, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
