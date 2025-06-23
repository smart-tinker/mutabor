import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { useAuth, AuthenticatedUser } from './auth/AuthContext';

// Mock the useAuth hook
vi.mock('./auth/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock child components that might be heavy or have their own side effects/tests
vi.mock('../pages/DashboardPage', () => ({ default: () => <div>DashboardPageMock</div>}));
vi.mock('../pages/RegistrationPage', () => ({ default: () => <div>RegistrationPageMock</div>}));
vi.mock('../pages/LoginPage', () => ({ default: () => <div>LoginPageMock</div>}));
vi.mock('../pages/LandingPage', () => ({ default: () => <div>LandingPageMock</div>}));
vi.mock('../widgets/Header/Header', () => ({ default: () => <header>HeaderMock</header>}));
vi.mock('../shared/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../shared/contexts/AddTaskModalContext', () => ({
  AddTaskModalContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>
  }
}));

describe('App Component Routing', () => {
  const mockUseAuth = useAuth as vi.Mock;

  beforeEach(() => {
    mockUseAuth.mockClear();
  });

  it('renders loading state initially if auth is loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true });
    render(<App />);
    expect(screen.getByText(/Loading application/i)).toBeInTheDocument();
  });

  it('renders landing page for unauthenticated user when auth is not loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, user: null });
    render(<App />);
    expect(screen.getByText('LandingPageMock')).toBeInTheDocument();
  });

  it('renders dashboard page for authenticated user when auth is not loading', () => {
    const mockUser: AuthenticatedUser = { name: 'Test User', email: 'test@example.com', id: '1' };
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, user: mockUser });
    render(<App />);
    expect(screen.getByText('DashboardPageMock')).toBeInTheDocument();
  });
});