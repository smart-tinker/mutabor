import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './RegistrationForm.module.css'; // Assuming similar styling needs
import { loginUserApi } from '../api';
import { useAuth } from '../../../app/auth/AuthContext'; // Corrected path

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth(); // Get login function from context

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Both email and password are required.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid. Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginUserApi({ email, password });
      if (response.token) {
        login(response.token); // Use context login function to store token and update state
        navigate('/'); // Redirect to home/dashboard
      } else {
        setError(response.message || 'Login failed: No token received.');
      }
    } catch (apiError: any) {
      setError(apiError.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit}>
        <h2>Login</h2>
        {error && <p className={styles.errorMessage}>{error}</p>}

        <div className={styles.formField}>
          <label htmlFor="login-email">Email:</label>
          <input
            type="email"
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="login-password">Password:</label>
          <input
            type="password"
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <button type="submit" className={`primary ${styles.submitButton}`} disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
        <p className={styles.registrationLinkContainer}>
          Don't have an account? <Link to="/register">Register here.</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginForm;
