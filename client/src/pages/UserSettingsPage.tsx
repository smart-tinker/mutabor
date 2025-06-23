import React from 'react';
import { useTheme, type ThemeOption } from '../shared/contexts/ThemeContext';
import styles from './UserSettingsPage.module.css'; // We'll create this CSS module next

const themeOptionsConfig: { value: ThemeOption; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

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
          {themeOptionsConfig.map((option) => (
            <label key={option.value}>
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={themeOption === option.value}
                onChange={handleThemeChange}
              />
              {option.label}
            </label>
          ))}
        </div>
      </section>
    </div>
  );
};

export default UserSettingsPage;
