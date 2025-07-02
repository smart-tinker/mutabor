// client/src/app/App.spec.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from './AppRouter';
import { AuthContext, AuthenticatedUser } from './auth/AuthContext';
import { AddTaskModalContext } from '../shared/contexts/AddTaskModalContext'; // ### НОВОЕ: Импортируем AddTaskModalContext

// Mock child components
vi.mock('../pages/DashboardPage', () => ({ default: () => <div>DashboardPageMock</div>}));
vi.mock('../pages/RegistrationPage', () => ({ default: () => <div>RegistrationPageMock</div>}));
vi.mock('../pages/LoginPage', () => ({ default: () => <div>LoginPageMock</div>}));
vi.mock('../pages/LandingPage', () => ({ default: () => <div>LandingPageMock</div>}));
vi.mock('../pages/ProjectSettingsPage', () => ({ default: () => <div>ProjectSettingsPageMock</div>}));
vi.mock('../pages/BoardPage', () => ({ default: () => <div>BoardPageMock</div> }));
vi.mock('../widgets/Header/Header', () => ({ default: () => <header>HeaderMock</header>}));

// ### ИЗМЕНЕНИЕ: Вспомогательная функция теперь включает AddTaskModalContext.Provider ###
const renderWithProviders = (
  ui: React.ReactElement, 
  { authValue, initialEntries = ['/'] }: { authValue: any; initialEntries?: string[] }
) => {
  const addTaskModalValue = {
    isModalOpen: false,
    openModal: vi.fn(),
    closeModal: vi.fn(),
  };

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={authValue}>
        <AddTaskModalContext.Provider value={addTaskModalValue}>
          {ui}
        </AddTaskModalContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('AppRouter Component', () => {

  it('renders loading state initially if auth is loading', () => {
    renderWithProviders(<AppRouter />, { 
      authValue: { isAuthenticated: false, isLoading: true, user: null } 
    });
    expect(screen.getByText(/Loading application/i)).toBeInTheDocument();
  });

  it('renders landing page for unauthenticated user when auth is not loading', () => {
    renderWithProviders(<AppRouter />, {
      authValue: { isAuthenticated: false, isLoading: false, user: null }
    });
    expect(screen.getByText('LandingPageMock')).toBeInTheDocument();
  });

  it('renders dashboard page for authenticated user when auth is not loading', () => {
    const mockUser: AuthenticatedUser = { name: 'Test User', email: 'test@example.com', id: '1' };
    renderWithProviders(<AppRouter />, {
      authValue: { isAuthenticated: true, isLoading: false, user: mockUser }
    });
    expect(screen.getByText('DashboardPageMock')).toBeInTheDocument();
  });
});