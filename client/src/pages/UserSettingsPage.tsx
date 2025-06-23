import React from 'react';
import { useTheme, ThemeOption } from '../shared/contexts/ThemeContext';
import styles from './UserSettingsPage.module.css'; // We'll create this CSS module next

const UserSettingsPage: React.FC = () => {
  const { themeOption, setThemeOption, effectiveTheme } = useTheme();

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setThemeOption(event.target.value as ThemeOption);
  };

  return (
    <div className={styles.settingsPage}>
      <h2>User Settings</h2>
      <section className={styles.themeSettings}>
        <h3>Theme</h3>
        <p>Current effective theme: {effectiveTheme}</p>
        <div className={styles.radioGroup}>
          <label>
            <input
              type="radio"
              name="theme"
              value="system"
              checked={themeOption === 'system'}
              onChange={handleThemeChange}
            />
            System
          </label>
          <label>
            <input
              type="radio"
              name="theme"
              value="light"
              checked={themeOption === 'light'}
              onChange={handleThemeChange}
            />
            Light
          </label>
          <label>
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={themeOption === 'dark'}
              onChange={handleThemeChange}
            />
            Dark
          </label>
        </div>
      </section>
    </div>
  );
};

export default UserSettingsPage;
