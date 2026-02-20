import React, { createContext, useContext, useState, ReactNode } from 'react';
import { apiLogin, apiRegister } from '@/services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { username: string } | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const SESSION_KEY = 'pa_migrate_session';

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ username: string } | null>(() => {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  });

  const login = async (username: string, password: string) => {
    try {
      const result = await apiLogin(username, password);
      if (result.success) {
        setUser({ username });
        localStorage.setItem(SESSION_KEY, JSON.stringify({ username }));
      }
      return result;
    } catch (err: any) {
      return { success: false, error: err.message || 'Server unreachable' };
    }
  };

  const register = async (username: string, password: string) => {
    try {
      const result = await apiRegister(username, password);
      if (result.success) {
        setUser({ username });
        localStorage.setItem(SESSION_KEY, JSON.stringify({ username }));
      }
      return result;
    } catch (err: any) {
      return { success: false, error: err.message || 'Server unreachable' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
