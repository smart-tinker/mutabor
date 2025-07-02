// client/src/app/AppRouter.tsx
import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { AddTaskModalContext } from '../shared/contexts/AddTaskModalContext';
import Header from '../widgets/Header/Header';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import RegistrationPage from '../pages/RegistrationPage';
import DashboardPage from '../pages/DashboardPage';
import BoardPage from '../pages/BoardPage';
import TaskPage from '../pages/TaskPage';
import UserSettingsPage from '../pages/UserSettingsPage';
import ProjectSettingsPage from '../pages/ProjectSettingsPage';
import NotFoundPage from '../pages/NotFoundPage';

export const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

  const addTaskModalContextValue = {
    isModalOpen: isAddTaskModalOpen,
    openModal: () => setIsAddTaskModalOpen(true),
    closeModal: () => setIsAddTaskModalOpen(false),
  };

  if (isLoading) {
    return <div>Loading application...</div>;
  }

  return (
    <AddTaskModalContext.Provider value={addTaskModalContextValue}>
      <Header />
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegistrationPage />} />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/projects/:projectId"
          element={isAuthenticated ? <BoardPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/tasks/:taskHid" 
          element={isAuthenticated ? <TaskPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <UserSettingsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/projects/:projectId/settings"
          element={isAuthenticated ? <ProjectSettingsPage /> : <Navigate to="/login" />}
        />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </AddTaskModalContext.Provider>
  );
};