// client/src/pages/ProjectSettings/MembersSettingsTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { projectService } from '../../shared/api/projectService';
import type { AllParticipantsDto } from '../../shared/api/types';
import { Modal } from '../../shared/ui/Modal'; 
import styles from '../ProjectSettingsPage.module.css';

interface MembersSettingsTabProps {
  projectId: number;
}

const MembersSettingsTab: React.FC<MembersSettingsTabProps> = ({ projectId }) => {
  const [participants, setParticipants] = useState<AllParticipantsDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<'editor' | 'viewer'>('editor');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<AllParticipantsDto | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchParticipants = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await projectService.getAllProjectParticipants(projectId);
      setParticipants(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load members.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);
  
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMemberEmail) {
        setAddMemberError("Email is required.");
        return;
    }
    setIsAddingMember(true);
    setAddMemberError(null);
    try {
        const newMember = await projectService.addProjectMember(projectId, { email: addMemberEmail, role: addMemberRole });
        // ### ИЗМЕНЕНИЕ: исправлена сортировка, чтобы использовать обе переменные ###
        setParticipants(prev => [...prev, newMember].sort((a, b) => {
          if (a.role === 'owner') return -1;
          if (b.role === 'owner') return 1;
          return (a.name || a.email).localeCompare(b.name || b.email);
        }));
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
        const updatedMember = await projectService.updateProjectMember(projectId, userId, { role: newRole });
        setParticipants(prev => prev.map(p => p.id === userId ? updatedMember : p));
        setError(null);
    } catch(err: any) {
        setError(err.response?.data?.message || "Failed to update role.");
    }
  };

  const promptRemoveMember = (member: AllParticipantsDto) => {
    setMemberToRemove(member);
    setIsConfirmModalOpen(true);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    setError(null);
    try {
        await projectService.removeProjectMember(projectId, memberToRemove.id);
        setParticipants(prev => prev.filter(p => p.id !== memberToRemove.id));
        setIsConfirmModalOpen(false);
        setMemberToRemove(null);
    } catch (err: any) {
        setError(err.response?.data?.message || "Failed to remove member.");
        setIsConfirmModalOpen(false); 
    } finally {
        setIsRemoving(false);
    }
  };

  if (isLoading) return <p>Loading members...</p>;

  return (
    <div>
      <h2>Members</h2>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.memberList}>
        {participants.map(p => (
          <div key={p.id} className={styles.memberItem} data-testid={`member-item-${p.id}`}>
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
                  <button className={`${styles.button} danger`} onClick={() => promptRemoveMember(p)}>Remove</button>
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
          <select value={addMemberRole} onChange={e => setAddMemberRole(e.target.value as 'editor' | 'viewer')}>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button type="submit" className={`${styles.button} primary`} disabled={isAddingMember}>
            {isAddingMember ? "Adding..." : "Add"}
          </button>
        </div>
      </form>

      <Modal 
        isOpen={isConfirmModalOpen} 
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Removal"
      >
        <div>
          <p>Are you sure you want to remove <strong>{memberToRemove?.name || memberToRemove?.email}</strong> from the project?</p>
          <div className={styles.formActions}>
            <button className="button secondary" onClick={() => setIsConfirmModalOpen(false)} disabled={isRemoving}>
              Cancel
            </button>
            <button className="button danger" onClick={confirmRemoveMember} disabled={isRemoving}>
              {isRemoving ? "Removing..." : "Remove Member"}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default MembersSettingsTab;