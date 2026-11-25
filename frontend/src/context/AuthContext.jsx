import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('insightagent_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('insightagent_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get('/api/auth/me')
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('insightagent_user', JSON.stringify(res.data.user));
      })
      .catch(() => {
        localStorage.removeItem('insightagent_token');
        localStorage.removeItem('insightagent_user');
        setUser(null);
      })
      .finally(() => setLoading(false));

    const handleExpired = () => setUser(null);
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const persistSession = (data) => {
    localStorage.setItem('insightagent_token', data.token);
    localStorage.setItem('insightagent_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    return persistSession(res.data);
  };

  const register = async (name, email, password) => {
    const res = await api.post('/api/auth/register', { name, email, password });
    return persistSession(res.data);
  };

  const exchangeGoogleCode = async (code) => {
    const res = await api.post('/api/auth/google/exchange', { code });
    return persistSession(res.data);
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('insightagent_token');
      if (token) {
        await api.post('/api/auth/logout');
      }
    } catch {
      // Clear local session even if server request fails
    } finally {
      localStorage.removeItem('insightagent_token');
      localStorage.removeItem('insightagent_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, exchangeGoogleCode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
