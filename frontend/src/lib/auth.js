'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, getToken, clearToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      // Try cached user first for instant render
      const cached = localStorage.getItem('agentvault_user') || localStorage.getItem('esakip_user');
      if (cached) {
        setUser(JSON.parse(cached));
        localStorage.setItem('agentvault_user', cached);
        localStorage.removeItem('esakip_user');
      }
      // Validate token against backend
      const me = await getMe();
      setUser(me);
      localStorage.setItem('agentvault_user', JSON.stringify(me));
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadUser);
  }, [loadUser]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    window.location.href = '/login';
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
      localStorage.setItem('agentvault_user', JSON.stringify(me));
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);
  return { user, loading };
}

export function useRequireRole(...roles) {
  const { user, loading } = useRequireAuth();
  const hasRole = user && roles.includes(user.role);
  return { user, loading, hasRole };
}
