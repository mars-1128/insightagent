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

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('insightagent_token', res.data.token);
    localStorage.setItem('insightagent_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/api/auth/register', { name, email, password });
    localStorage.setItem('insightagent_token', res.data.token);
    localStorage.setItem('insightagent_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('insightagent_token');
    localStorage.removeItem('insightagent_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
