// client/src/app/auth/AuthContext.tsx
// ### ИЗМЕНЕНИЕ: 'ReactNode' импортируется как тип ###
import { createContext, useState, useContext, useEffect, useCallback, type ReactNode } from 'react';
import jwtDecode from 'jwt-decode';

export interface AuthenticatedUser {
  id: string; 
  email: string; 
  name?: string; 
}

interface DecodedJwtPayload {
  sub: string;
  email: string;
  name?: string;
  iat?: number;
  exp?: number;
}

interface AuthContextType {
  authToken: string | null;
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

// ### ИЗМЕНЕНИЕ: Добавляем export ###
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decoded = jwtDecode<DecodedJwtPayload>(token);
        setUser({ id: decoded.sub, email: decoded.email, name: decoded.name });
        setAuthToken(token);
      } catch (error) {
        console.error("Failed to decode token on initial load:", error);
        localStorage.removeItem('authToken');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleAuthError = () => {
      console.log("Auth error event received, logging out.");
      logout();
    };

    window.addEventListener('auth-error', handleAuthError);

    return () => {
      window.removeEventListener('auth-error', handleAuthError);
    };
  }, [logout]);

  const login = (token: string) => {
    try {
      const decoded = jwtDecode<DecodedJwtPayload>(token);
      setUser({ id: decoded.sub, email: decoded.email, name: decoded.name });
      localStorage.setItem('authToken', token);
      setAuthToken(token);
    } catch (error) {
      console.error("Failed to decode token on login:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ authToken, user, isAuthenticated: !!authToken && !!user, login, logout, isLoading }}>
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