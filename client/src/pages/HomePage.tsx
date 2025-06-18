import React from 'react';
import { useAuth } from '../app/auth/AuthContext'; // Assuming you might want to display user info
import styles from './PageStyles.module.css'; // Create a common style for pages

const HomePage = () => {
  const { authToken } = useAuth(); // Example: retrieve token or user info

  // You could decode the token here if it contains user information like name
  // For now, just a generic welcome.

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1>Welcome to Mutabor</h1>
      </header>
      <section>
        <p>This is your main dashboard area. More features will be added soon!</p>
        {/*
        Example of showing something from auth token, if it were decoded:
        {authToken && <p>Your authentication token (first 10 chars): {authToken.substring(0, 10)}...</p>}
        */}
      </section>
    </div>
  );
};

export default HomePage;
