import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, setToken, clearToken } from '@/lib/api';

type AppRole = 'admin' | 'staff';

interface UserData {
  id: string;
  email: string;
}

interface AuthContextType {
  user: UserData | null;
  session: any;
  role: AppRole | null;
  profile: { full_name: string; email: string } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check stored token by calling /auth/me
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/auth/me').then(({ data, error }) => {
      if (data && !error) {
        setUser({ id: data.id, email: data.email });
        setRole(data.role as AppRole);
        setProfile({ full_name: data.full_name, email: data.email });
      } else {
        clearToken();
      }
      setLoading(false);
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await api.post('/auth/login', { email, password });
    if (error || !data?.token) {
      return { error: error || 'Erreur de connexion' };
    }
    setToken(data.token);
    setUser({ id: data.user.id, email: data.user.email });
    setRole(data.user.role as AppRole);
    setProfile({ full_name: data.user.full_name, email: data.user.email });
    return { error: null };
  };

  const signOut = async () => {
    clearToken();
    setUser(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session: user, role, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
