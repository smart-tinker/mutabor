import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../shared/api/projectService';
import type { ProjectSettingsResponse, UpdateProjectSettingsPayload } from '../shared/api/types';
import styles from './ProjectSettingsPage.module.css';
// Assuming a shared Button and Input component exists, otherwise use native ones
// import Button from '../shared/ui/Button/Button';
// import Input from '../shared/ui/Input/Input';

const ProjectSettingsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<ProjectSettingsResponse | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectPrefix, setProjectPrefix] = useState('');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const numProjectId = Number(projectId);

  useEffect(() => {
    if (isNaN(numProjectId)) {
      setError('Invalid Project ID.');
      setIsLoading(false);
      return;
    }

    projectService.getProjectSettings(numProjectId)
      .then(data => {
        setSettings(data);
        setProjectName(data.name);
        setProjectPrefix(data.prefix);
        setStatuses(data.settings_statuses || []);
        setTypes(data.settings_types || []);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to fetch project settings:', err);
        setError(err.response?.data?.message || 'Failed to load project settings.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [numProjectId]);

  const handleListChange = (
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    const newList = [...list];
    newList[index] = value;
    setter(newList);
  };

  const addListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, '']);
  };

  const removeListItem = (list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    const newList = [...list];
    newList.splice(index, 1);
    setter(newList);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving || !settings) return;

    setIsSaving(true);
    setError(null);

    const payload: UpdateProjectSettingsPayload = {};
    if (projectName !== settings.name) payload.name = projectName;
    if (projectPrefix !== settings.prefix) payload.prefix = projectPrefix;

    // Deep compare arrays to see if they actually changed
    if (JSON.stringify(statuses) !== JSON.stringify(settings.settings_statuses || [])) {
        payload.statuses = statuses.filter(s => s.trim() !== ''); // Filter out empty strings
    }
    if (JSON.stringify(types) !== JSON.stringify(settings.settings_types || [])) {
        payload.types = types.filter(t => t.trim() !== ''); // Filter out empty strings
    }

    if (Object.keys(payload).length === 0) {
        setError("No changes to save.");
        setIsSaving(false);
        return;
    }

    try {
      const updatedSettings = await projectService.updateProjectSettings(numProjectId, payload);
      setSettings(updatedSettings); // Update local state with response from server
      setProjectName(updatedSettings.name);
      setProjectPrefix(updatedSettings.prefix);
      setStatuses(updatedSettings.settings_statuses || []);
      setTypes(updatedSettings.settings_types || []);
      // Optionally, show a success message
    } catch (err: any) {
      console.error('Failed to update project settings:', err);
      setError(err.response?.data?.message || 'Failed to save project settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className={styles.loading}>Loading project settings...</div>;
  if (error && !settings) return <div className={styles.error}>{error}</div>; // Show only error if settings never loaded
  if (!settings) return <div className={styles.error}>Project settings not found.</div>; // Should be covered by error state

  return (
    <div className={styles.settingsPage}>
      <h1>Project Settings: {settings.name}</h1>
      {error && <div className={styles.error} style={{marginBottom: '1rem'}}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <h2>General</h2>
        <div className={styles.formGroup}>
          <label htmlFor="projectName">Project Name</label>
          <input // Replace with <Input /> if available
            type="text"
            id="projectName"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="projectPrefix">Task Prefix</label>
          <input // Replace with <Input /> if available
            type="text"
            id="projectPrefix"
            value={projectPrefix}
            onChange={(e) => setProjectPrefix(e.target.value.toUpperCase())}
            maxLength={10}
            required
          />
        </div>

        <h2>Task Statuses</h2>
        <div className={styles.listEditor}>
          {statuses.map((status, index) => (
            <div key={index} className={styles.listItem}>
              <input // Replace with <Input /> if available
                type="text"
                value={status}
                onChange={(e) => handleListChange(statuses, setStatuses, index, e.target.value)}
                placeholder="Status name"
              />
              <button // Replace with <Button type="button" variant="danger" ... />
                type="button"
                className={`${styles.button} ${styles.danger}`}
                onClick={() => removeListItem(statuses, setStatuses, index)}
              >
                Remove
              </button>
            </div>
          ))}
          <button // Replace with <Button type="button" ... />
            type="button"
            className={`${styles.button} ${styles.addListItemButton}`}
            onClick={() => addListItem(setStatuses)}
          >
            Add Status
          </button>
        </div>

        <h2>Task Types</h2>
        <div className={styles.listEditor}>
          {types.map((type, index) => (
            <div key={index} className={styles.listItem}>
              <input // Replace with <Input /> if available
                type="text"
                value={type}
                onChange={(e) => handleListChange(types, setTypes, index, e.target.value)}
                placeholder="Type name"
              />
              <button // Replace with <Button type="button" variant="danger" ... />
                type="button"
                className={`${styles.button} ${styles.danger}`}
                onClick={() => removeListItem(types, setTypes, index)}
              >
                Remove
              </button>
            </div>
          ))}
          <button // Replace with <Button type="button" ... />
            type="button"
            className={`${styles.button} ${styles.addListItemButton}`}
            onClick={() => addListItem(setTypes)}
          >
            Add Type
          </button>
        </div>

        <button // Replace with <Button type="submit" ... />
          type="submit"
          className={`${styles.button} ${styles.submitButton}`}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
      <button className={`${styles.button} ${styles.secondary}`} onClick={() => navigate(-1)} style={{marginTop: '1rem'}}>
        Back
      </button>
    </div>
  );
};

export default ProjectSettingsPage;
