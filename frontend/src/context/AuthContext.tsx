import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../types';
import { authApi, getStoredAccessToken } from '../services/api';

interface SignupData {
  email: string;
  password: string;
  display_name: string;
  semester?: number;
  department?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getMe();
      setUser(currentUser);
    } catch {
      setUser(null);
      authApi.logout();
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getStoredAccessToken();
      if (token) {
        try {
          const currentUser = await authApi.getMe();
          setUser(currentUser);
        } catch {
          authApi.logout();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setUser(res.user);
  };

  const signup = async (data: SignupData) => {
    const res = await authApi.signup(data);
    setUser(res.user);
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
