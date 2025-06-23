// client/src/features/ProjectMembers/ui/ManageProjectMembersModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { getProjectMembers, addProjectMember } from '../api';
import type { ProjectMemberDto, AddMemberDto } from '../../../shared/api/projectService';
import styles from './ManageProjectMembersModal.module.css';

interface ManageProjectMembersModalProps {
  projectId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

const ManageProjectMembersModal: React.FC<ManageProjectMembersModalProps> = ({ projectId, isOpen, onClose }) => {
  const [members, setMembers] = useState<ProjectMemberDto[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [errorMembers, setErrorMembers] = useState<string | null>(null);

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('editor'); // Default role
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!projectId) return;
    setIsLoadingMembers(true);
    setErrorMembers(null);
    try {
      const fetchedMembers = await getProjectMembers(projectId);
      setMembers(fetchedMembers);
    } catch (error) {
      console.error('Failed to fetch project members:', error);
      setErrorMembers('Failed to load members.');
    } finally {
      setIsLoadingMembers(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchMembers();
    }
  }, [isOpen, projectId, fetchMembers]);

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !newMemberEmail.trim() || !newMemberRole.trim()) {
      setAddMemberError('Email and role are required.');
      return;
    }
    setIsAddingMember(true);
    setAddMemberError(null);
    try {
      const newMemberData: AddMemberDto = { email: newMemberEmail, role: newMemberRole };
      const addedMember = await addProjectMember(projectId, newMemberData);
      setMembers(prevMembers => [...prevMembers, addedMember]);
      setNewMemberEmail('');
      setNewMemberRole('editor'); // Reset form
    } catch (error: any) {
      console.error('Failed to add member:', error);
      setAddMemberError(error.response?.data?.message || 'Failed to add member.');
    } finally {
      setIsAddingMember(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>Manage Project Members</h2>

        <h3>Current Members</h3>
        {isLoadingMembers && <p>Loading members...</p>}
        {errorMembers && <p className={styles.errorText}>{errorMembers}</p>}
        {!isLoadingMembers && members.length === 0 && <p>No members yet (besides the owner).</p>}
        <ul className={styles.memberList}>
          {members.map(member => (
            <li key={member.user_id} className={styles.memberItem}>
              <span>{member.user?.name || member.user?.email} ({member.role})</span>
              {/* Add kick/role change buttons here later */}
            </li>
          ))}
        </ul>

        <hr />
        <h3>Add New Member</h3>
        <form onSubmit={handleAddMemberSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="newMemberEmail">User Email:</label>
            <input
              id="newMemberEmail"
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              required
              disabled={isAddingMember}
              className={addMemberError ? 'input-error' : ''}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="newMemberRole">Role:</label>
            <input
              id="newMemberRole"
              type="text"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              placeholder="e.g., editor, viewer"
              required
              disabled={isAddingMember}
              className={addMemberError ? 'input-error' : ''}
            />
          </div>
          {addMemberError && <p className={styles.errorText}>{addMemberError}</p>}
          <div className={styles.buttonContainer}>
            <button type="submit" disabled={isAddingMember}>
              {isAddingMember ? 'Adding...' : 'Add Member'}
            </button>
            <button type="button" onClick={onClose}>Close</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageProjectMembersModal;