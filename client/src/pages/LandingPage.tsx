import React from 'react';
import { Link } from 'react-router-dom';

// Basic inline styles for demonstration
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as 'column', // Type assertion for 'column'
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    textAlign: 'center' as 'center', // Type assertion for 'center'
    padding: '20px',
  },
  heading: {
    marginBottom: '20px',
  },
  paragraph: {
    marginBottom: '30px',
    fontSize: '1.1em',
    maxWidth: '600px',
  },
  navLinks: {
    display: 'flex',
    gap: '20px',
  },
  linkButton: {
    padding: '10px 20px',
    textDecoration: 'none',
    backgroundColor: '#007bff',
    color: 'white',
    borderRadius: '5px',
    fontSize: '1em',
  }
};

const LandingPage: React.FC = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Welcome to Mutabor Task Manager!</h1>
      <p style={styles.paragraph}>
        Mutabor helps you manage your tasks efficiently, collaborate with your team,
        and leverage AI to boost your productivity. Get started by logging in or
        creating a new account.
      </p>
      <div style={styles.navLinks}>
        <Link to="/login" style={styles.linkButton}>Login</Link>
        <Link to="/register" style={styles.linkButton}>Register</Link>
      </div>
    </div>
  );
};

export default LandingPage;
