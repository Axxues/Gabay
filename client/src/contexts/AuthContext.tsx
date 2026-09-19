import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, UserRole } from '@/services/lms/types/lms.types';
import { getToken, setToken, clearToken } from '@/services/core/client';
import { authApi } from '@/services/auth/api/auth.api';

const DEFAULT_GUEST: User = {
  id: 'guest',
  name: 'Guest User',
  email: 'guest@dmmmsu.edu.ph',
  role: 'student',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  department: 'College of Information Technology',
  title: 'Student',
};

export interface AuthContextType {
  currentUser: User | null;
  activeUser: User;
  activeRole: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  authReady: boolean;
  lastError: string | null;
  login: (emailOrId: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (partial: Partial<User>) => Promise<void>;
  switchRole: (role: UserRole) => void;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Restore token on bootstrap
  useEffect(() => {
    let active = true;
    const token = getToken();
    if (!token || token === 'undefined' || token === 'null') {
      clearToken();
      setCurrentUser(null);
      setAuthReady(true);
      return;
    }

    setIsLoading(true);
    authApi.me()
      .then(res => {
        if (!active) return;
        if (res.user) {
          setCurrentUser(res.user as User);
        }
      })
      .catch(() => {
        if (!active) return;
        clearToken();
        setCurrentUser(null);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
          setAuthReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (emailOrId: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    setLastError(null);
    try {
      const res = await authApi.login({ email: emailOrId, password });
      if (res.token && res.user) {
        setToken(res.token);
        setCurrentUser(res.user as User);
        return { success: true };
      }
      return { success: false, message: 'Invalid credentials' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setLastError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    clearToken();
    setCurrentUser(null);
    setLastError(null);
  }, []);

  const updateUser = useCallback(async (partial: Partial<User>): Promise<void> => {
    setCurrentUser(prev => prev ? { ...prev, ...partial } : null);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setCurrentUser(prev => prev ? { ...prev, role } : null);
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const activeUser = currentUser || DEFAULT_GUEST;
  const activeRole: UserRole = currentUser?.role || 'student';
  const isAuthenticated = currentUser !== null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activeUser,
        activeRole,
        isAuthenticated,
        isLoading,
        authReady,
        lastError,
        login,
        logout,
        updateUser,
        switchRole,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
