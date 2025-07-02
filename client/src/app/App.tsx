// client/src/app/App.tsx
import React from 'react';
import './styles/global.css';
import { ThemeProvider } from '../shared/contexts/ThemeContext';
import { AppRouter } from './AppRouter'; // Импортируем роутер

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  );
};

export default App;