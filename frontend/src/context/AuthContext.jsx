import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refreshToken'));
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user && !!accessToken;

  const login = useCallback(async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    if (!data?.success || !data?.data) throw new Error(data?.message || 'Login failed');
    const { user: u, accessToken: at, refreshToken: rt } = data.data;
    localStorage.setItem('accessToken', at);
    localStorage.setItem('refreshToken', rt);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    setAccessToken(at);
    setRefreshToken(rt);
    return u;
  }, []);

  const logout = useCallback(async () => {
    const rt = localStorage.getItem('refreshToken');
    try {
      if (rt) await api.post('/auth/logout', { refreshToken: rt });
    } catch (_) {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  }, []);

  const getUser = useCallback(() => user, [user]);

  // On mount: restore user from localStorage and verify token with a lightweight call
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const at = localStorage.getItem('accessToken');
    if (!storedUser || !at) {
      setLoading(false);
      return;
    }
    try {
      setUser(JSON.parse(storedUser));
      // Verify token by calling a protected endpoint (e.g. test/officer which both roles can hit)
      api.get('/test/officer')
        .then(() => setLoading(false))
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setUser(null);
          setAccessToken(null);
          setRefreshToken(null);
          setLoading(false);
        });
    } catch {
      setLoading(false);
    }
  }, []);

  const value = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    loading,
    login,
    logout,
    getUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
