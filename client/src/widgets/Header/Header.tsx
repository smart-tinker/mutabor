import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth/AuthContext';
import LogoutButton from '../../features/authByEmail/ui/LogoutButton';
import { NotificationBell } from '../../features/Notifications'; // Import NotificationBell
import styles from './Header.module.css';

const Header = () => {
  const { isAuthenticated, isLoading, user } = useAuth(); // Add user from useAuth

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <Link to="/" className={styles.logo}>
          Mutabor
        </Link>
        <nav className={styles.navigation}>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            {isLoading ? (
              <li>Loading...</li>
            ) : isAuthenticated && user ? ( // Check for user object as well
              <>
                <li className={styles.welcomeMessage}> {/* Optional: Add styling for welcome message */}
                  <span>Welcome, {user.name || user.email}</span>
                </li>
                <li>
                  <NotificationBell />
                </li>
                <li>
                  <LogoutButton />
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/register">Register</Link>
                </li>
                <li>
                  <Link to="/login">Login</Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
