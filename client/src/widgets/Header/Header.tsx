import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/auth/AuthContext';
import LogoutButton from '../../features/authByEmail/ui/LogoutButton';
import { NotificationBell } from '../../features/Notifications';
import ThemeSwitcher from '../../features/ThemeSwitcher/ThemeSwitcher'; // Import ThemeSwitcher
import styles from './Header.module.css';
import { useAddTaskModal } from '../../shared/contexts/AddTaskModalContext';

const Header: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { openModal } = useAddTaskModal();
  const location = useLocation();

  // Show "+ Add Task" button only on the board page
  const showAddTaskButton = isAuthenticated && location.pathname.startsWith('/projects/');

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <Link to="/" className={styles.logo}>
          Mutabor
        </Link>
        <nav className={styles.navigation}>
          <ul>
            {isLoading ? (
              <li>Loading...</li>
            ) : isAuthenticated && user ? (
              <>
                <li>
                  <NavLink to="/dashboard" className={({ isActive }) => isActive ? styles.active : ''}>Dashboard</NavLink>
                </li>
                {showAddTaskButton && (
                  <li>
                    <button onClick={openModal} className={styles.addTaskButtonHeader}>
                      + Add Task
                    </button>
                  </li>
                )}
                <li className={styles.welcomeMessage}>
                  <span>Welcome, {user.name || user.email}</span>
                </li>
                <li>
                  <NotificationBell />
                </li>
                <li>
                  <ThemeSwitcher /> {/* Add ThemeSwitcher component */}
                </li>
                <li>
                  <LogoutButton />
                </li>
              </>
            ) : (
              <>
                <li>
                  <NavLink to="/" className={({ isActive }) => isActive ? styles.active : ''}>Home</NavLink>
                </li>
                <li>
                  <NavLink to="/register" className={({ isActive }) => isActive ? styles.active : ''}>Register</NavLink>
                </li>
                <li>
                  <NavLink to="/login" className={({ isActive }) => isActive ? styles.active : ''}>Login</NavLink>
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