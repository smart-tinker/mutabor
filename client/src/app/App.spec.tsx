import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

// Mock the useAuth hook
jest.mock('./auth/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock child components that might be heavy or have their own side effects/tests
jest.mock('../pages/HomePage', () => () => <div>HomePageMock</div>);
jest.mock('../pages/RegistrationPage', () => () => <div>RegistrationPageMock</div>);
jest.mock('../pages/LoginPage', () => () => <div>LoginPageMock</div>);
jest.mock('../widgets/Layout/MainLayout', () => ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout-mock">{children}</div>);


describe('App Component', () => {
  const { useAuth: mockUseAuth } = jest.requireMock('./auth/AuthContext') as { useAuth: jest.Mock };

  beforeEach(() => {
    // Reset mocks before each test
    mockUseAuth.mockReset();
  });

  it('renders loading state initially if auth is loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true, login: jest.fn(), logout: jest.fn(), register: jest.fn(), user: null });
    render(<App />); // App already includes BrowserRouter
    expect(screen.getByText(/Loading application state.../i)).toBeInTheDocument();
  });

  it('renders login page for unauthenticated user when auth is not loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, login: jest.fn(), logout: jest.fn(), register: jest.fn(), user: null });
    render(<App />);
    // The App component itself handles the routing. We expect LoginPageMock to be rendered via PublicRoute.
    // We also expect MainLayout to be present.
    expect(screen.getByTestId('main-layout-mock')).toBeInTheDocument();
    expect(screen.getByText('LoginPageMock')).toBeInTheDocument();
  });

  it('renders home page for authenticated user when auth is not loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, login: jest.fn(), logout: jest.fn(), register: jest.fn(), user: { name: 'Test User', email: 'test@example.com', id: '1' } });
    render(<App />);
    // The App component itself handles the routing. We expect HomePageMock to be rendered via ProtectedRoute.
    expect(screen.getByTestId('main-layout-mock')).toBeInTheDocument();
    expect(screen.getByText('HomePageMock')).toBeInTheDocument();
  });

  // Test for navigation to /register might be more involved if we want to click links.
  // For now, this covers the basic rendering logic based on auth state.
});
