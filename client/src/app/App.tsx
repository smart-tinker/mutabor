// Example in App.tsx using react-router-dom
import React, { useState } from 'react'; // Import useState
import './styles/global.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import RegistrationPage from '../pages/RegistrationPage';
import DashboardPage from '../pages/DashboardPage';
import BoardPage from '../pages/BoardPage';
import TaskPage from '../pages/TaskPage'; // Импорт новой страницы
import LandingPage from '../pages/LandingPage';
import NotFoundPage from '../pages/NotFoundPage';
import { useAuth } from './auth/AuthContext';
import Header from '../widgets/Header/Header';
import { AddTaskModalContext } from '../shared/contexts/AddTaskModalContext'; // Import the context

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

  const openAddTaskModal = () => setIsAddTaskModalOpen(true);
  const closeAddTaskModal = () => setIsAddTaskModalOpen(false);

  const addTaskModalContextValue = {
    isModalOpen: isAddTaskModalOpen,
    openModal: openAddTaskModal,
    closeModal: closeAddTaskModal,
  };

  if (isLoading) {
    return <div>Loading application...</div>;
  }

  return (
    <AddTaskModalContext.Provider value={addTaskModalContextValue}>
      <Router>
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
            path="/task/:taskId" // Новый маршрут для страницы задачи
            element={isAuthenticated ? <TaskPage /> : <Navigate to="/login" />}
          />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Router>
    </AddTaskModalContext.Provider>
  );
};

export default App;