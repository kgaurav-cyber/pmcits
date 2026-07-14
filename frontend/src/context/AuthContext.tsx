'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  token: string | null;
  user: {
    id: string;
    email: string;
    role: 'Employee' | 'Medical Officer' | 'Accounts Officer' | 'DDO' | 'Treasury' | 'Administrator';
    full_name: string;
    district: string;
  } | null;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthContextType['user'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // Restore session on mount
    const savedToken = localStorage.getItem('pmcits_token');
    const savedUser = localStorage.getItem('pmcits_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: any) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Login failed. Please verify credentials.');
      }

      const { token: jwt, user: userProfile } = data.data;

      setToken(jwt);
      setUser(userProfile);
      localStorage.setItem('pmcits_token', jwt);
      localStorage.setItem('pmcits_user', JSON.stringify(userProfile));

      router.push('/dashboard');
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}` 
          }
        });
      }
    } catch (e) {
      console.error('Logout request failed', e);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('pmcits_token');
      localStorage.removeItem('pmcits_user');
      router.push('/login');
    }
  };

  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        logout();
      }
      const detailsStr = data.error?.details ? ` (Details: ${JSON.stringify(data.error.details)})` : '';
      throw new Error((data.error?.message || 'Request failed.') + detailsStr);
    }
    return data;
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isLoading, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
