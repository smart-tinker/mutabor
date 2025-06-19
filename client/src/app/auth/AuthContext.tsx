import { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import jwtDecode from 'jwt-decode'; // Import jwt-decode

// Define the user structure based on typical JWT payload
export interface AuthenticatedUser {
  id: string; // Usually 'sub' or a custom claim like 'userId'
  email: string; // Usually 'email'
  name?: string; // Optional, usually 'name'
  // Add other fields you expect in your JWT, e.g., roles
}

interface DecodedJwtPayload {
  sub: string; // Standard subject claim, often used for user ID
  email: string;
  name?: string;
  iat?: number;
  exp?: number;
  // Add other claims as per your JWT structure
}

interface AuthContextType {
  authToken: string | null;
  user: AuthenticatedUser | null; // Add user to context
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthenticatedUser | null>(null); // State for user
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decoded = jwtDecode<DecodedJwtPayload>(token);
        // Map decoded payload to AuthenticatedUser structure
        // Ensure your JWT has 'sub' (for id) and 'email'. 'name' is optional.
        // The backend's JWT generation (e.g., in auth.service.ts login method)
        // should include these claims: { sub: user.id, email: user.email, name: user.name }
        setUser({ id: decoded.sub, email: decoded.email, name: decoded.name });
        setAuthToken(token);
      } catch (error) {
        console.error("Failed to decode token on initial load:", error);
        localStorage.removeItem('authToken'); // Clear invalid token
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string) => {
    try {
      const decoded = jwtDecode<DecodedJwtPayload>(token);
      setUser({ id: decoded.sub, email: decoded.email, name: decoded.name });
      localStorage.setItem('authToken', token);
      setAuthToken(token);
    } catch (error) {
      console.error("Failed to decode token on login:", error);
      // Handle login failure due to bad token if necessary
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setUser(null); // Clear user on logout
    // Consider redirecting or other cleanup
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
