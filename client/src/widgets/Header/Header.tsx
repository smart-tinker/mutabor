import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth/AuthContext';
import LogoutButton from '../../features/authByEmail/ui/LogoutButton';
import styles from './Header.module.css';

const Header = () => {
  const { isAuthenticated, isLoading } = useAuth();

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
            ) : isAuthenticated ? (
              <li>
                <LogoutButton />
              </li>
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
