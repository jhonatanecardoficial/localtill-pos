import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api, { setAuthTokens, clearAuthTokens, getAuthToken } from '@/lib/api';

import { UserRole } from '@/types/auth';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  branch_id: string | null;
  is_active: boolean;
  roles: UserRole[];
  branch_name?: string;
}

interface AuthContextType {
  user: User | null;
  userRoles: UserRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Verificar token salvo ao carregar
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const userData = await api.get<User>('/auth/me');
      setUser(userData);
      setUserRoles(userData.roles || []);
    } catch (err) {
      console.error('Erro ao buscar usuário:', err);
      clearAuthTokens();
      setUser(null);
      setUserRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const response = await api.post<{
      token: string;
      refreshToken: string;
      user: User;
    }>('/auth/login', { email, password });

    setAuthTokens(response.token, response.refreshToken);
    setUser(response.user);
    setUserRoles(response.user.roles || []);
  };

  const signOut = () => {
    clearAuthTokens();
    setUser(null);
    setUserRoles([]);
  };

  return (
    <AuthContext.Provider value={{ user, userRoles, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
