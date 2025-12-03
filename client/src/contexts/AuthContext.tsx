import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { queryClient } from '@/lib/queryClient';

interface User {
  id: number;
  username: string;
  email: string | null;
  role: string;
  isActive: boolean;
  firstName: string | null;
  lastName: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (username: string, password: string, email?: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/user', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string, rememberMe: boolean = false) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, rememberMe }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const userData = await response.json();
    setUser(userData);
  };

  const register = async (
    username: string,
    password: string,
    email?: string,
    firstName?: string,
    lastName?: string
  ) => {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email, firstName, lastName }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const userData = await response.json();
    setUser(userData);
  };

  const logout = async () => {
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
    // Clear all cached data to ensure fresh state for next user
    queryClient.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
