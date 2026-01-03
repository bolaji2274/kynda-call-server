// ============================================================================
// MISSING FILE 8: frontend/src/hooks/useAuth.js (Optional but useful)
// ============================================================================

import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useAuth() {
  const [token, setToken] = useLocalStorage('token', null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from token
    if (token) {
      try {
        // Decode JWT (basic decode, not verification)
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        setUser({
          id: payload.userId || payload.id,
          role: payload.role,
          email: payload.email,
        });
      } catch (error) {
        console.error('Error decoding token:', error);
        setToken(null);
      }
    }
    setLoading(false);
  }, [token]);

  const login = (newToken) => {
    setToken(newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return {
    token,
    user,
    loading,
    isAuthenticated: !!token,
    login,
    logout,
  };
}

