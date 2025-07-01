// client/src/pages/ProjectSettingsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../shared/api/projectService';
import type { ProjectSettingsResponse, UpdateProjectSettingsPayload, AllParticipantsDto } from '../shared/api/types';
import styles from './ProjectSettingsPage.module.css';

const ProjectSettingsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<ProjectSettingsResponse | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectPrefix, setProjectPrefix] = useState('');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  
  // ### НОВЫЕ СОСТОЯНИЯ ДЛЯ УПРАВЛЕНИЯ УЧАСТНИКАМИ ###
  const [participants, setParticipants] = useState<AllParticipantsDto[]>([]);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('editor');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const numProjectId = Number(projectId);

  const fetchAllData = useCallback(async () => {
    if (isNaN(numProjectId)) {
        setError('Invalid Project ID.');
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const [settingsData, membersData] = await Promise.all([
            projectService.getProjectSettings(numProjectId),
            projectService.getAllProjectParticipants(numProjectId)
        ]);
        
        setSettings(settingsData);
        setProjectName(settingsData.name);
        setProjectPrefix(settingsData.prefix);
        setStatuses(settingsData.settings_statuses || []);
        setTypes(settingsData.settings_types || []);
        setParticipants(membersData);
        setError(null);
    } catch (err: any) {
        console.error('Failed to fetch project data:', err);
        setError(err.response?.data?.message || 'Failed to load project data.');
    } finally {
        setIsLoading(false);
    }
  }, [numProjectId]);


  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- Handlers for General Settings ---
  const handleListChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prevList => {
        const newList = [...prevList];
        newList[index] = value;
        return newList;
    });
  };

  const addListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, '']);
  };

  const removeListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prevList => prevList.filter((_, i) => i !== index));
  };
  
  // --- Handlers for Members Section ---
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMemberEmail) {
        setAddMemberError("Email is required.");
        return;
    }
    setIsAddingMember(true);
    setAddMemberError(null);
    try {
        const newMember = await projectService.addProjectMember(numProjectId, { email: addMemberEmail, role: addMemberRole });
        setParticipants(prev => [...prev, newMember]);
        setAddMemberEmail('');
        setAddMemberRole('editor');
    } catch (err: any) {
        setAddMemberError(err.response?.data?.message || 'Failed to add member.');
    } finally {
        setIsAddingMember(false);
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: 'editor' | 'viewer') => {
    try {
        const updatedMember = await projectService.updateProjectMember(numProjectId, userId, { role: newRole });
        setParticipants(prev => prev.map(p => p.id === userId ? updatedMember : p));
    } catch(err: any) {
        setError(err.response?.data?.message || "Failed to update role.");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
        try {
            await projectService.removeProjectMember(numProjectId, userId);
            setParticipants(prev => prev.filter(p => p.id !== userId));
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to remove member.");
        }
    }
  };


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving || !settings) return;

    setIsSaving(true);
    setError(null);

    const payload: UpdateProjectSettingsPayload = {};
    if (projectName !== settings.name) payload.name = projectName;
    if (projectPrefix !== settings.prefix) payload.prefix = projectPrefix;

    if (JSON.stringify(statuses) !== JSON.stringify(settings.settings_statuses || [])) {
        payload.statuses = statuses.filter(s => s.trim() !== '');
    }
    if (JSON.stringify(types) !== JSON.stringify(settings.settings_types || [])) {
        payload.types = types.filter(t => t.trim() !== '');
    }

    if (Object.keys(payload).length === 0) {
        setError("No changes to save.");
        setIsSaving(false);
        return;
    }

    try {
      await projectService.updateProjectSettings(numProjectId, payload);
      // Data is already updated locally, maybe just show a success message
    } catch (err: any) {
      console.error('Failed to update project settings:', err);
      setError(err.response?.data?.message || 'Failed to save project settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className={styles.loading}>Loading project settings...</div>;
  if (error && !settings) return <div className={styles.error}>{error}</div>;
  if (!settings) return <div className={styles.error}>Project settings not found.</div>;

  return (
    <div className={styles.settingsPage}>
      <h1>Project Settings: {settings.name}</h1>
      {error && <div className={styles.error} style={{marginBottom: '1rem'}}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <h2>General</h2>
        <div className={styles.formGroup}>
          <label htmlFor="projectName">Project Name</label>
          <input type="text" id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="projectPrefix">Task Prefix</label>
          <input type="text" id="projectPrefix" value={projectPrefix} onChange={(e) => setProjectPrefix(e.target.value.toUpperCase())} maxLength={10} required />
        </div>

        <h2>Task Statuses</h2>
        <div className={styles.listEditor}>
          {statuses.map((status, index) => (
            <div key={index} className={styles.listItem}>
              <input type="text" value={status} onChange={(e) => handleListChange(setStatuses, index, e.target.value)} placeholder="Status name" />
              <button type="button" className={`${styles.button} ${styles.danger}`} onClick={() => removeListItem(setStatuses, index)}>Remove</button>
            </div>
          ))}
          <button type="button" className={`${styles.button} ${styles.addListItemButton}`} onClick={() => addListItem(setStatuses)}>Add Status</button>
        </div>

        <h2>Task Types</h2>
        <div className={styles.listEditor}>
          {types.map((type, index) => (
            <div key={index} className={styles.listItem}>
              <input type="text" value={type} onChange={(e) => handleListChange(setTypes, index, e.target.value)} placeholder="Type name" />
              <button type="button" className={`${styles.button} ${styles.danger}`} onClick={() => removeListItem(setTypes, index)}>Remove</button>
            </div>
          ))}
          <button type="button" className={`${styles.button} ${styles.addListItemButton}`} onClick={() => addListItem(setTypes)}>Add Type</button>
        </div>

        <button type="submit" className={`${styles.button} ${styles.submitButton}`} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save General Settings'}
        </button>
      </form>
      
      {/* ### НОВЫЙ БЛОК ДЛЯ УПРАВЛЕНИЯ УЧАСТНИКАМИ ### */}
      <div className={styles.membersSection}>
        <h2>Members</h2>
        <div className={styles.memberList}>
            {participants.map(p => (
                <div key={p.id} className={styles.memberItem}>
                    <div className={styles.memberInfo}>
                        <span className={styles.memberName}>{p.name || p.email}</span>
                        <span className={styles.memberEmail}>{p.email}</span>
                    </div>
                    <div className={styles.memberControls}>
                        {p.role === 'owner' ? (
                            <span className={styles.ownerTag}>Owner</span>
                        ) : (
                            <>
                                <select value={p.role} onChange={(e) => handleUpdateMemberRole(p.id, e.target.value as 'editor' | 'viewer')}>
                                    <option value="editor">Editor</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                                <button className={`${styles.button} ${styles.danger}`} onClick={() => handleRemoveMember(p.id)}>Remove</button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
        <form className={styles.addMemberForm} onSubmit={handleAddMember}>
            <h3>Add Member</h3>
            {addMemberError && <p className={styles.error}>{addMemberError}</p>}
            <div className={styles.formGroup}>
                <input type="email" placeholder="User's email" value={addMemberEmail} onChange={e => setAddMemberEmail(e.target.value)} />
                <select value={addMemberRole} onChange={e => setAddMemberRole(e.target.value)}>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                </select>
                <button type="submit" className={styles.button} disabled={isAddingMember}>
                    {isAddingMember ? "Adding..." : "Add Member"}
                </button>
            </div>
        </form>
      </div>

      <button className={`${styles.button} ${styles.secondary}`} onClick={() => navigate(-1)} style={{marginTop: '1rem'}}>
        Back to Board
      </button>
    </div>
  );
};

export default ProjectSettingsPage;