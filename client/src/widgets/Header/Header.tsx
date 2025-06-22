import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth/AuthContext';
import LogoutButton from '../../features/authByEmail/ui/LogoutButton';
import { NotificationBell } from '../../features/Notifications'; // Import NotificationBell
import styles from './Header.module.css';
import { useAddTaskModal } from '../../shared/contexts/AddTaskModalContext'; // Import the hook

// No longer need HeaderProps for onOpenAddTaskModal
// interface HeaderProps {
//   onOpenAddTaskModal?: () => void;
// }

const Header: React.FC = () => { // Remove props
  const { isAuthenticated, isLoading, user } = useAuth(); // Add user from useAuth
  // Directly use the context. If the provider is missing, the useAddTaskModal hook will throw an error.
  // This is generally desired in development to catch setup issues.
  // App.tsx now guarantees the provider is present for Header.
  const { openModal } = useAddTaskModal();


  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <Link to="/" className={styles.logo}>
          Mutabor
        </Link>
        <nav className={styles.navigation}>
          <ul>
            <li>
              <Link to="/">{isAuthenticated ? "Dashboard" : "Home"}</Link>
            </li>
            {isLoading ? (
              <li>Loading...</li>
            ) : isAuthenticated && user ? ( // Check for user object as well
              <>
                {openModal && ( // Conditionally render based on openModal from context
                  <li>
                    <button onClick={openModal} className={styles.addTaskButtonHeader}>
                      + Add Task
                    </button>
                  </li>
                )}
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
