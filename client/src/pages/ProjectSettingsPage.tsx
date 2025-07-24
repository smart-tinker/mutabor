// client/src/pages/ProjectSettingsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { projectService } from '../shared/api/projectService';
import type { ProjectSettingsResponse } from '../shared/api/types';
import GeneralSettingsTab from './ProjectSettings/GeneralSettingsTab';
import MembersSettingsTab from './ProjectSettings/MembersSettingsTab';
import StatusesSettingsTab from './ProjectSettings/StatusesSettingsTab';
import TypesSettingsTab from './ProjectSettings/TypesSettingsTab';
import styles from './ProjectSettingsPage.module.css';

const ProjectSettingsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';

  const [settings, setSettings] = useState<ProjectSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const numProjectId = Number(projectId);

  const fetchSettingsData = useCallback(async () => {
    if (isNaN(numProjectId)) {
        setError('Invalid Project ID.');
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const settingsData = await projectService.getProjectSettings(numProjectId);
        setSettings(settingsData);
        setError(null);
    } catch (err: any) {
        console.error('Failed to fetch project settings:', err);
        setError(err.response?.data?.message || 'Failed to load project settings.');
    } finally {
        setIsLoading(false);
    }
  }, [numProjectId]);

  const handleSettingsChanged = (newName: string) => {
    if (settings) {
      setSettings({...settings, name: newName});
    }
  }

  useEffect(() => {
    fetchSettingsData();
  }, [fetchSettingsData]);

  const renderActiveTab = () => {
    if (!settings) return null;

    switch (activeTab) {
      case 'general':
        return <GeneralSettingsTab projectId={numProjectId} initialName={settings.name} initialPrefix={settings.prefix} onSettingsChanged={handleSettingsChanged} />;
      case 'statuses':
        return <StatusesSettingsTab projectId={numProjectId} initialStatuses={settings.settings_statuses || []} />;
      case 'types':
        return <TypesSettingsTab projectId={numProjectId} initialTypes={settings.settings_types || []} />;
      case 'members':
        return <MembersSettingsTab projectId={numProjectId} />;
      default:
        return <GeneralSettingsTab projectId={numProjectId} initialName={settings.name} initialPrefix={settings.prefix} onSettingsChanged={handleSettingsChanged} />;
    }
  };

  if (isLoading) return <div className={styles.loading}>Loading project settings...</div>;
  if (error || !settings) return <div className={styles.error}>{error || 'Project not found.'}</div>;
  
  return (
    <div className={styles.settingsPage}>
      <h1>Project Settings: {settings.name}</h1>
      <div className={styles.settingsLayout}>
        <aside className={styles.sidebar}>
          <ul className={styles.sidebarNav}>
            <li className={styles.navItem}>
              <Link to="?tab=general" className={activeTab === 'general' ? styles.active : ''}>General</Link>
            </li>
            <li className={styles.navItem}>
              <Link to="?tab=statuses" className={activeTab === 'statuses' ? styles.active : ''}>Statuses</Link>
            </li>
            <li className={styles.navItem}>
              <Link to="?tab=types" className={activeTab === 'types' ? styles.active : ''}>Types</Link>
            </li>
            <li className={styles.navItem}>
              <Link to="?tab=members" className={activeTab === 'members' ? styles.active : ''}>Members</Link>
            </li>
          </ul>
        </aside>
        <main className={styles.contentArea}>
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
};

export default ProjectSettingsPage;