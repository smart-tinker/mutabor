import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/auth/AuthContext';

// Basic inline styles for demonstration
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh', // Use less than 100vh if there's a header/footer
    textAlign: 'center' as 'center',
    padding: '20px',
  },
  heading: {
    fontSize: '2.5em',
    marginBottom: '20px',
    color: '#333',
  },
  message: {
    fontSize: '1.2em',
    marginBottom: '30px',
    color: '#555',
  },
  link: {
    padding: '10px 20px',
    textDecoration: 'none',
    backgroundColor: '#007bff',
    color: 'white',
    borderRadius: '5px',
    fontSize: '1em',
  }
};

const NotFoundPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const destinationPath = isAuthenticated ? '/dashboard' : '/';
  const linkText = isAuthenticated ? 'Go to Dashboard' : 'Go to Homepage';

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>404 - Page Not Found</h1>
      <p style={styles.message}>
        Sorry, the page you are looking for does not exist or you may not have permission to view it.
      </p>
      <Link to={destinationPath} style={styles.link}>
        {linkText}
      </Link>
    </div>
  );
};

export default NotFoundPage;
