// Example in App.tsx using react-router-dom
import React from 'react';
import './styles/global.css';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import LoginPage from '../pages/LoginPage'; // Assuming LoginPage exists
import RegistrationPage from '../pages/RegistrationPage'; // Assuming RegistrationPage exists
import DashboardPage from '../pages/DashboardPage';
import BoardPage from '../pages/BoardPage';
import LandingPage from '../pages/LandingPage'; // Import LandingPage
import NotFoundPage from '../pages/NotFoundPage'; // Import NotFoundPage
import { useAuth } from './auth/AuthContext'; // Import the real useAuth
import Header from '../widgets/Header/Header';

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth(); // Use real useAuth, include isLoading

  // Optional: Show a global loading spinner while AuthContext is initializing
  if (isLoading) {
    return <div>Loading application...</div>; // Or a proper spinner component
  }

  return (
    <Router>
      <Header />
      <Routes>
        {/* Root route: Landing page for unauthenticated, redirect to dashboard for authenticated */}
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage />} />

        {/* Auth routes: Redirect to dashboard if authenticated, otherwise show login/register */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegistrationPage />} />

        {/* Protected routes: Redirect to login if not authenticated */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/projects/:projectId"
          element={isAuthenticated ? <BoardPage /> : <Navigate to="/login" />}
        />

        {/* 404 Handling */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} /> {/* Catch-all route */}

      </Routes>
    </Router>
  );
};

export default App;
