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
  let openModalFromContext: (() => void) | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { openModal } = useAddTaskModal(); // Get openModal from context
    openModalFromContext = openModal;
  } catch (error) {
    // Context not available, means this Header instance is not rendered under a BoardPage
    // or similar page that provides AddTaskModalContext. Button will not be shown.
    // console.warn("AddTaskModalContext not found, 'Add Task' button will not be available in this Header instance.");
  }


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
                {openModalFromContext && ( // Conditionally render based on context availability
                  <li>
                    <button onClick={openModalFromContext} className={styles.addTaskButtonHeader}>
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
