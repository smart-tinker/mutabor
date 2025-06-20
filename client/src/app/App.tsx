// Example in App.tsx using react-router-dom
import React from 'react';
import './styles/global.css';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import LoginPage from '../pages/LoginPage'; // Assuming LoginPage exists
import RegistrationPage from '../pages/RegistrationPage'; // Assuming RegistrationPage exists
import DashboardPage from '../pages/DashboardPage';
import BoardPage from '../pages/BoardPage';
import { useAuth } from './auth/AuthContext'; // Import the real useAuth

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth(); // Use real useAuth, include isLoading

  // Optional: Show a global loading spinner while AuthContext is initializing
  if (isLoading) {
    return <div>Loading application...</div>; // Or a proper spinner component
  }

  return (
    <Router>
      <nav>
        <Link to="/">Home (Login)</Link> | <Link to="/dashboard">Dashboard</Link>
      </nav>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />

        <Route
          path="/dashboard"
          element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/projects/:projectId"
          element={isAuthenticated ? <BoardPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
};

export default App;
