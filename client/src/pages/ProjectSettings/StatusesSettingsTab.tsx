// client/src/pages/ProjectSettings/StatusesSettingsTab.tsx
import React, { useState, useEffect } from 'react';
import { projectService } from '../../shared/api/projectService';
import styles from '../ProjectSettingsPage.module.css';

interface StatusesSettingsTabProps {
  projectId: number;
  initialStatuses: string[];
}

const StatusesSettingsTab: React.FC<StatusesSettingsTabProps> = ({ projectId, initialStatuses }) => {
  const [statuses, setStatuses] = useState(initialStatuses);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  useEffect(() => {
    setStatuses(initialStatuses);
  }, [initialStatuses]);

  const handleListChange = (index: number, value: string) => {
    setStatuses(prevList => {
      const newList = [...prevList];
      newList[index] = value;
      return newList;
    });
  };

  const addListItem = () => setStatuses(prev => [...prev, '']);
  const removeListItem = (index: number) => setStatuses(prevList => prevList.filter((_, i) => i !== index));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const filteredStatuses = statuses.filter(s => s.trim() !== '');
    if (JSON.stringify(filteredStatuses) === JSON.stringify(initialStatuses)) {
      setError("No changes to save.");
      setIsSaving(false);
      return;
    }

    try {
      await projectService.updateProjectSettings(projectId, { statuses: filteredStatuses });
      setSuccess("Statuses saved successfully!");
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save statuses.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div>
      <h2>Task Statuses</h2>
      <form onSubmit={handleSubmit}>
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={`${styles.error} ${styles.success}`}>{success}</p>}
        <div className={styles.listEditor}>
          {statuses.map((status, index) => (
            <div key={index} className={styles.listItem}>
              <input type="text" value={status} onChange={(e) => handleListChange(index, e.target.value)} placeholder="Status name" />
              <button type="button" className={`${styles.button} danger`} onClick={() => removeListItem(index)}>Remove</button>
            </div>
          ))}
          <button type="button" className={`${styles.button} ${styles.addListItemButton}`} onClick={addListItem}>Add Status</button>
        </div>
        <button type="submit" className={`${styles.button} primary ${styles.submitButton}`} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Statuses'}
        </button>
      </form>
    </div>
  );
};

export default StatusesSettingsTab;