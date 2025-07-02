// client/src/pages/ProjectSettings/GeneralSettingsTab.tsx
import React, { useState, useEffect } from 'react';
import { projectService } from '../../shared/api/projectService';
import type { UpdateProjectSettingsPayload } from '../../shared/api/types';
import styles from '../ProjectSettingsPage.module.css';

interface GeneralSettingsTabProps {
  projectId: number;
  initialName: string;
  initialPrefix: string;
  onSettingsChanged: (newName: string) => void;
}

const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({ projectId, initialName, initialPrefix, onSettingsChanged }) => {
  const [projectName, setProjectName] = useState(initialName);
  const [projectPrefix, setProjectPrefix] = useState(initialPrefix);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setProjectName(initialName);
    setProjectPrefix(initialPrefix);
  }, [initialName, initialPrefix]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const payload: UpdateProjectSettingsPayload = {};
    if (projectName !== initialName) payload.name = projectName;
    if (projectPrefix !== initialPrefix) payload.prefix = projectPrefix;
    
    if (Object.keys(payload).length === 0) {
      setError("No changes to save.");
      setIsSaving(false);
      return;
    }

    try {
      await projectService.updateProjectSettings(projectId, payload);
      setSuccess("Settings saved successfully!");
      onSettingsChanged(projectName);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div>
      <h2>General</h2>
      <form onSubmit={handleSubmit}>
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={`${styles.error} ${styles.success}`}>{success}</p>}
        <div className={styles.formGroup}>
          <label htmlFor="projectName">Project Name</label>
          <input type="text" id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="projectPrefix">Task Prefix</label>
          <input type="text" id="projectPrefix" value={projectPrefix} onChange={(e) => setProjectPrefix(e.target.value.toUpperCase())} maxLength={10} required />
        </div>
        <button type="submit" className={`${styles.button} primary ${styles.submitButton}`} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save General Settings'}
        </button>
      </form>
    </div>
  );
};

export default GeneralSettingsTab;