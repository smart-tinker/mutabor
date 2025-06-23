// Example in App.tsx using react-router-dom
import React, { useState } from 'react'; // Import useState
import './styles/global.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '../shared/contexts/ThemeContext'; // Import ThemeProvider
import LoginPage from '../pages/LoginPage';
import RegistrationPage from '../pages/RegistrationPage';
import DashboardPage from '../pages/DashboardPage';
import BoardPage from '../pages/BoardPage';
import TaskPage from '../pages/TaskPage'; // Импорт новой страницы
import UserSettingsPage from '../pages/UserSettingsPage'; // Import UserSettingsPage
import ProjectSettingsPage from '../pages/ProjectSettingsPage'; // Import ProjectSettingsPage
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
    <ThemeProvider>
      <AppContent
        isAuthenticated={isAuthenticated}
        // isLoading={isLoading} // Removed, as it's not a prop of AppContent
        addTaskModalContextValue={addTaskModalContextValue}
      />
    </ThemeProvider>
  );
};

interface AppContentProps {
  isAuthenticated: boolean;
  // isLoading: boolean; // This was removed as unused previously
  addTaskModalContextValue: {
    isModalOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
  };
}

// Create a new component to use the theme context
const AppContent: React.FC<AppContentProps> = ({ isAuthenticated, addTaskModalContextValue }) => {
  // const { theme } = useTheme(); // No longer needed here, as ThemeProvider handles it

  // useEffect(() => { // This logic is now in ThemeProvider via useThemeSetup
  //   document.documentElement.setAttribute('data-theme', theme);
  // }, [theme]);

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
          <Route
            path="/settings"
            element={isAuthenticated ? <UserSettingsPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/project/:projectId/settings"
            element={isAuthenticated ? <ProjectSettingsPage /> : <Navigate to="/login" />}
          />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Router>
    </AddTaskModalContext.Provider>
  );
};

export default App;