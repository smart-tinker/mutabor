import React, { useState } from 'react';
import styles from './RegistrationForm.module.css'; // Import CSS Modules
import { registerUserApi } from '../api'; // Import the API function
// import { useAuth } from '../../../app/auth/AuthContext'; // 'login' больше не используется, поэтому этот импорт не нужен
import { useNavigate, Link } from 'react-router-dom'; // Import useNavigate and Link

const RegistrationForm = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // const { login } = useAuth(); // УДАЛЕНО: 'login' больше не используется
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid. Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await registerUserApi({ name, email, password });
      setSuccessMessage('Registration successful! Please log in.');
      setName('');
      setEmail('');
      setPassword('');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (apiError: any) {
      setError(apiError.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit}>
        <h2>Register</h2>
        {error && <p className={styles.errorMessage}>{error}</p>}
        {successMessage && <p className={styles.successMessage}>{successMessage}</p>}

        <div className={styles.formField}>
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            className={error ? 'input-error' : ''}
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className={error ? 'input-error' : ''}
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className={error ? 'input-error' : ''}
          />
        </div>

        <button type="submit" className={`primary ${styles.submitButton}`} disabled={isLoading}>
          {isLoading ? 'Registering...' : 'Register'}
        </button>
        <p className={styles.registrationLinkContainer}>Already have an account? <Link to="/login">Login here.</Link></p>
      </form>
    </div>
  );
};

export default RegistrationForm;