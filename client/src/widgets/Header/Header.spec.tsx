import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
import { useAuth } from '../../app/auth/AuthContext';

// Mock useAuth
vi.mock('../../app/auth/AuthContext');

// Mock child components
vi.mock('../../features/Notifications', () => ({
  NotificationBell: () => <div data-testid="notification-bell">NotificationBell</div>,
}));
vi.mock('../../features/authByEmail/ui/LogoutButton', () => ({
  default: () => <button>Logout</button>,
}));

describe('Header Component', () => {
  const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated User', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { name: 'Test User', email: 'test@example.com' },
      });
      render(
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      );
    });

    it('should display Dashboard link', () => {
      expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
    });

    it('should display welcome message with user name', () => {
      expect(screen.getByText(/Welcome, Test User/i)).toBeInTheDocument();
    });

    it('should display NotificationBell', () => {
      expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    });

    it('should display LogoutButton', () => {
      expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
    });

    it('should NOT display Login link', () => {
      expect(screen.queryByRole('link', { name: /Login/i })).not.toBeInTheDocument();
    });

    it('should NOT display Register link', () => {
      expect(screen.queryByRole('link', { name: /Register/i })).not.toBeInTheDocument();
    });
  });

  describe('Authenticated User (displays email if name is not available)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { email: 'test@example.com' }, // No name
      });
      render(
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      );
    });
    it('should display welcome message with user email if name is not available', () => {
      expect(screen.getByText(/Welcome, test@example.com/i)).toBeInTheDocument();
    });
  });


  describe('Unauthenticated User', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      });
      render(
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      );
    });

    it('should display Home link', () => {
      expect(screen.getByRole('link', { name: /Home/i })).toBeInTheDocument();
    });

    it('should display Login link', () => {
      expect(screen.getByRole('link', { name: /Login/i })).toBeInTheDocument();
    });

    it('should display Register link', () => {
      expect(screen.getByRole('link', { name: /Register/i })).toBeInTheDocument();
    });

    it('should NOT display welcome message', () => {
      expect(screen.queryByText(/Welcome,/i)).not.toBeInTheDocument();
    });

    it('should NOT display NotificationBell', () => {
      expect(screen.queryByTestId('notification-bell')).not.toBeInTheDocument();
    });

    it('should NOT display LogoutButton', () => {
      expect(screen.queryByRole('button', { name: /Logout/i })).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should display loading message when isLoading is true', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false, // Or true, doesn't matter for loading state
        isLoading: true,
        user: null,
      });
      render(
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      );
      expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();
    });
  });
});
