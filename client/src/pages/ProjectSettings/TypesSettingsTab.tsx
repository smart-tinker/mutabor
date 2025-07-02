// client/src/pages/ProjectSettings/TypesSettingsTab.tsx
import React, { useState, useEffect } from 'react';
import { projectService } from '../../shared/api/projectService';
import styles from '../ProjectSettingsPage.module.css';

interface TypesSettingsTabProps {
  projectId: number;
  initialTypes: string[];
}

const TypesSettingsTab: React.FC<TypesSettingsTabProps> = ({ projectId, initialTypes }) => {
  const [types, setTypes] = useState(initialTypes);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setTypes(initialTypes);
  }, [initialTypes]);

  const handleListChange = (index: number, value: string) => {
    setTypes(prevList => {
      const newList = [...prevList];
      newList[index] = value;
      return newList;
    });
  };

  const addListItem = () => setTypes(prev => [...prev, '']);
  const removeListItem = (index: number) => setTypes(prevList => prevList.filter((_, i) => i !== index));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const filteredTypes = types.filter(t => t.trim() !== '');
    if (JSON.stringify(filteredTypes) === JSON.stringify(initialTypes)) {
      setError("No changes to save.");
      setIsSaving(false);
      return;
    }

    try {
      await projectService.updateProjectSettings(projectId, { types: filteredTypes });
      setSuccess("Task types saved successfully!");
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save task types.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div>
      <h2>Task Types</h2>
      <form onSubmit={handleSubmit}>
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={`${styles.error} ${styles.success}`}>{success}</p>}
        <div className={styles.listEditor}>
          {types.map((type, index) => (
            <div key={index} className={styles.listItem}>
              <input type="text" value={type} onChange={(e) => handleListChange(index, e.target.value)} placeholder="Type name" />
              <button type="button" className={`${styles.button} danger`} onClick={() => removeListItem(index)}>Remove</button>
            </div>
          ))}
          <button type="button" className={`${styles.button} ${styles.addListItemButton}`} onClick={addListItem}>Add Type</button>
        </div>
        <button type="submit" className={`${styles.button} primary ${styles.submitButton}`} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Types'}
        </button>
      </form>
    </div>
  );
};

export default TypesSettingsTab;