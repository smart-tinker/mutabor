// client/src/features/TaskDetailModal/ui/TaskDetailModal.tsx
import React, { useEffect, useState, useCallback } from 'react';
// Use CommentDto from taskService, TaskDto from projectService
import type { TaskDto } from '../../../shared/api/projectService';
import { taskService } from '../../../shared/api/taskService'; // Import taskService
import type { UpdateTaskDto, CommentDto, ApiCommentDto } from '../../../shared/api/taskService'; // Import UpdateTaskDto
import { transformCommentDto } from '../../../shared/api/taskService';

import { getTaskComments } from '../../Comments/api';
import { CommentList, AddCommentForm } from '../../Comments';
import { socket } from '../../../shared/lib/socket';
import styles from './TaskDetailModal.module.css';

interface TaskDetailModalProps {
  task: TaskDto | null;
  isOpen: boolean;
  onClose: () => void;
  projectId: number | null; // For WebSocket room context
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, isOpen, onClose, projectId }) => {
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [errorComments, setErrorComments] = useState<string | null>(null);

  // Editable fields states
  const [editableTitle, setEditableTitle] = useState('');
  const [editableDescription, setEditableDescription] = useState('');
  const [editableDueDate, setEditableDueDate] = useState('');
  const [editableType, setEditableType] = useState('');
  const [editablePriority, setEditablePriority] = useState('');
  const [editableTags, setEditableTags] = useState(''); // Comma-separated string for input

  // Field-specific editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [isEditingType, setIsEditingType] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);

  // Field-specific update and error states
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  const [titleUpdateError, setTitleUpdateError] = useState<string | null>(null);
  const [isUpdatingDescription, setIsUpdatingDescription] = useState(false);
  const [descriptionUpdateError, setDescriptionUpdateError] = useState<string | null>(null);
  const [isUpdatingDueDate, setIsUpdatingDueDate] = useState(false);
  const [dueDateUpdateError, setDueDateUpdateError] = useState<string | null>(null);
  const [isUpdatingType, setIsUpdatingType] = useState(false);
  const [typeUpdateError, setTypeUpdateError] = useState<string | null>(null);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [priorityUpdateError, setPriorityUpdateError] = useState<string | null>(null);
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);
  const [tagsUpdateError, setTagsUpdateError] = useState<string | null>(null);


  // Initialize editable fields when task changes or modal opens
  useEffect(() => {
    if (task) {
      setEditableTitle(task.title);
      setEditableDescription(task.description || '');
      setEditableDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
      setEditableType(task.type || '');
      setEditablePriority(task.priority || '');
      setEditableTags(task.tags ? task.tags.join(', ') : '');
    }
  }, [task, isOpen]); // Re-run if isOpen changes to ensure reset if modal is reopened with same task

  const fetchComments = useCallback(async () => {
    if (!task) return;
    setIsLoadingComments(true);
    setErrorComments(null);
    try {
      const fetchedComments = await getTaskComments(task.id);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      setErrorComments('Could not load comments.');
    } finally {
      setIsLoadingComments(false);
    }
  }, [task]);

  useEffect(() => {
    if (isOpen && task) {
      fetchComments();
    }
  }, [isOpen, task, fetchComments]);

  useEffect(() => {
    if (!isOpen || !task || !projectId) return;

    const handleCommentCreated = (newComment: ApiCommentDto) => {
      console.log('comment:created event received in TaskDetailModal', newComment);
      if (newComment.task_id === task.id) {
        const commentToDisplay = transformCommentDto(newComment);
        setComments(prevComments => {
          if (prevComments.find(c => c.id === commentToDisplay.id)) return prevComments;
          return [...prevComments, commentToDisplay].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        });
      }
    };

    socket.on('comment:created', handleCommentCreated);

    return () => {
      socket.off('comment:created', handleCommentCreated);
    };
  }, [isOpen, task, projectId]);

  const handleCommentAdded = (newComment: CommentDto) => {
    // Optimistically add and sort, or wait for socket event if preferred
     setComments(prevComments =>
        [...prevComments, newComment].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
     );
  };

  if (!isOpen || !task) return null;

  const handleSaveTitle = async () => {
    if (!task) return;
    setIsUpdatingTitle(true);
    setTitleUpdateError(null);
    try {
      await taskService.updateTask(task.id, { title: editableTitle });
      setIsEditingTitle(false);
      // Task data will be updated via WebSocket event `task:updated`
    } catch (error: any) {
      setTitleUpdateError(error.message || 'Failed to update title.');
    } finally {
      setIsUpdatingTitle(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!task) return;
    setIsUpdatingDescription(true);
    setDescriptionUpdateError(null);
    try {
      await taskService.updateTask(task.id, { description: editableDescription });
      setIsEditingDescription(false);
    } catch (error: any) {
      setDescriptionUpdateError(error.message || 'Failed to update description.');
    } finally {
      setIsUpdatingDescription(false);
    }
  };

  const handleSaveDueDate = async () => {
    if (!task) return;
    setIsUpdatingDueDate(true);
    setDueDateUpdateError(null);
    try {
      await taskService.updateTask(task.id, { dueDate: editableDueDate ? editableDueDate : null });
      setIsEditingDueDate(false);
    } catch (error: any) {
      setDueDateUpdateError(error.message || 'Failed to update due date.');
    } finally {
      setIsUpdatingDueDate(false);
    }
  };

  const handleSaveType = async () => {
    if (!task) return;
    setIsUpdatingType(true);
    setTypeUpdateError(null);
    try {
      await taskService.updateTask(task.id, { type: editableType });
      setIsEditingType(false);
    } catch (error: any) {
      setTypeUpdateError(error.message || 'Failed to update type.');
    } finally {
      setIsUpdatingType(false);
    }
  };

  const handleSavePriority = async () => {
    if (!task) return;
    setIsUpdatingPriority(true);
    setPriorityUpdateError(null);
    try {
      await taskService.updateTask(task.id, { priority: editablePriority });
      setIsEditingPriority(false);
    } catch (error: any) {
      setPriorityUpdateError(error.message || 'Failed to update priority.');
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const handleSaveTags = async () => {
    if (!task) return;
    setIsUpdatingTags(true);
    setTagsUpdateError(null);
    try {
      const tagsArray = editableTags.trim() ? editableTags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
      await taskService.updateTask(task.id, { tags: tagsArray });
      setIsEditingTags(false);
    } catch (error: any) {
      setTagsUpdateError(error.message || 'Failed to update tags.');
    } finally {
      setIsUpdatingTags(false);
    }
  };

  // Basic date formatter for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Global edit mode removed, content is always "view" with inline edit options */}
        <>
          <div className={styles.taskDetails}>
            <div className={styles.taskHeader}>
              {/* Title Editing */}
              {isEditingTitle ? (
                <div className={styles.inlineEditSection}>
                  <input type="text" value={editableTitle} onChange={e => setEditableTitle(e.target.value)} className={styles.formInputFull} disabled={isUpdatingTitle} />
                  <div className={styles.inlineEditSectionControls}>
                    <button onClick={handleSaveTitle} className={`${styles.button} ${styles.buttonSmall} ${styles.buttonPrimary}`} disabled={isUpdatingTitle}>
                      {isUpdatingTitle ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => { setIsEditingTitle(false); setEditableTitle(task.title); setTitleUpdateError(null); }} className={`${styles.button} ${styles.buttonSmall} ${styles.buttonSecondary}`} disabled={isUpdatingTitle}>Cancel</button>
                  </div>
                  {titleUpdateError && <p className={styles.errorTextSmall}>{titleUpdateError}</p>}
                </div>
              ) : (
                <h2>
                  <span>{task.humanReadableId}: {task.title}</span>
                  <button onClick={() => { setIsEditingTitle(true); setTitleUpdateError(null); }} className={`${styles.button} ${styles.buttonLink} ${styles.editIcon}`}>Edit</button>
                </h2>
              )}
            </div>

            {/* Description Editing */}
            <div className={styles.description}>
              {isEditingDescription ? (
                <div className={styles.inlineEditSection}>
                  <textarea value={editableDescription} onChange={e => setEditableDescription(e.target.value)} className={styles.formTextareaFull} disabled={isUpdatingDescription} />
                  <div className={styles.inlineEditSectionControls}>
                    <button onClick={handleSaveDescription} className={`${styles.button} ${styles.buttonSmall} ${styles.buttonPrimary}`} disabled={isUpdatingDescription}>
                      {isUpdatingDescription ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => { setIsEditingDescription(false); setEditableDescription(task.description || ''); setDescriptionUpdateError(null); }} className={`${styles.button} ${styles.buttonSmall} ${styles.buttonSecondary}`} disabled={isUpdatingDescription}>Cancel</button>
                  </div>
                  {descriptionUpdateError && <p className={styles.errorTextSmall}>{descriptionUpdateError}</p>}
                </div>
              ) : (
                <>
                  <span className={styles.descriptionText}>{task.description || 'No description.'}</span>
                  <button onClick={() => { setIsEditingDescription(true); setDescriptionUpdateError(null); }} className={`${styles.button} ${styles.buttonLink} ${styles.editIcon}`}>Edit</button>
                </>
              )}
            </div>

            <div className={styles.metaGrid}>
              {/* Due Date Editing */}
              <div className={styles.metaGridItem}>
                <strong className={styles.metaGridItemLabel}>Due Date:</strong>
                <div className={styles.metaGridItemValue}>
                  {isEditingDueDate ? (
                    <div className={styles.inlineEditSectionCompact}>
                      <div className={styles.inlineEditSectionCompactControls}>
                        <input type="date" value={editableDueDate} onChange={e => setEditableDueDate(e.target.value)} className={styles.formInput} disabled={isUpdatingDueDate}/>
                        <button onClick={handleSaveDueDate} className={`${styles.button} ${styles.buttonSmall} ${styles.buttonPrimary}`} disabled={isUpdatingDueDate}>
                          {isUpdatingDueDate ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => { setIsEditingDueDate(false); setEditableDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''); setDueDateUpdateError(null); }} className={`${styles.button} ${styles.buttonSmall} ${styles.buttonSecondary}`} disabled={isUpdatingDueDate}>Cancel</button>
                      </div>
                      {dueDateUpdateError && <p className={styles.errorTextSmall}>{dueDateUpdateError}</p>}
                    </div>
                  ) : (
                    <>
                      <span>{formatDate(task.dueDate)}</span>
                      <button onClick={() => { setIsEditingDueDate(true); setDueDateUpdateError(null); }} className={`${styles.button} ${styles.buttonLink} ${styles.editIcon}`}>Edit</button>
                    </>
                  )}
                </div>
              </div>

              {/* Type Editing */}
              <div className={styles.metaGridItem}>
                <strong className={styles.metaGridItemLabel}>Type:</strong>
                <div className={styles.metaGridItemValue}>
                  {isEditingType ? (
                    <div className={styles.inlineEditSectionCompact}>
                      <div className={styles.inlineEditSectionCompactControls}>
                        <input type="text" value={editableType} onChange={e => setEditableType(e.target.value)} className={styles.formInput} placeholder="e.g., Bug, Feature" disabled={isUpdatingType}/>
                        <button onClick={handleSaveType} className={`${styles.button} ${styles.buttonSmall} ${styles.buttonPrimary}`} disabled={isUpdatingType}>
                          {isUpdatingType ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => { setIsEditingType(false); setEditableType(task.type || ''); setTypeUpdateError(null); }} className={`${styles.button} ${styles.buttonSmall} ${styles.buttonSecondary}`} disabled={isUpdatingType}>Cancel</button>
                      </div>
                      {typeUpdateError && <p className={styles.errorTextSmall}>{typeUpdateError}</p>}
                    </div>
                  ) : (
                    <>
                      <span>{task.type || 'Not set'}</span>
                      <button onClick={() => { setIsEditingType(true); setTypeUpdateError(null); }} className={`${styles.button} ${styles.buttonLink} ${styles.editIcon}`}>Edit</button>
                    </>
                  )}
                </div>
              </div>

              {/* Priority Editing */}
              <div className={styles.metaGridItem}>
                <strong className={styles.metaGridItemLabel}>Priority:</strong>
                <div className={styles.metaGridItemValue}>
                  {isEditingPriority ? (
                    <div className={styles.inlineEditSectionCompact}>
                      <div className={styles.inlineEditSectionCompactControls}>
                        <input type="text" value={editablePriority} onChange={e => setEditablePriority(e.target.value)} className={styles.formInput} placeholder="e.g., High, Medium, Low" disabled={isUpdatingPriority}/>
                        <button onClick={handleSavePriority} className={`${styles.button} ${styles.buttonSmall} ${styles.buttonPrimary}`} disabled={isUpdatingPriority}>
                          {isUpdatingPriority ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => { setIsEditingPriority(false); setEditablePriority(task.priority || ''); setPriorityUpdateError(null); }} className={`${styles.button} ${styles.buttonSmall} ${styles.buttonSecondary}`} disabled={isUpdatingPriority}>Cancel</button>
                      </div>
                      {priorityUpdateError && <p className={styles.errorTextSmall}>{priorityUpdateError}</p>}
                    </div>
                  ) : (
                    <>
                      <span>{task.priority || 'Not set'}</span>
                      <button onClick={() => { setIsEditingPriority(true); setPriorityUpdateError(null); }} className={`${styles.button} ${styles.buttonLink} ${styles.editIcon}`}>Edit</button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Tags Editing */}
            <div className={styles.tagsSection}>
              <strong className={styles.tagsSectionLabel}>Tags:</strong>
              {isEditingTags ? (
                <div className={styles.inlineEditSection}>
                  <input type="text" value={editableTags} onChange={e => setEditableTags(e.target.value)} className={styles.formInputFull} placeholder="e.g., UI, Backend" disabled={isUpdatingTags}/>
                  <div className={styles.inlineEditSectionControls}>
                    <button onClick={handleSaveTags} className={`${styles.button} ${styles.buttonSmall} ${styles.buttonPrimary}`} disabled={isUpdatingTags}>
                      {isUpdatingTags ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => { setIsEditingTags(false); setEditableTags(task.tags ? task.tags.join(', ') : ''); setTagsUpdateError(null); }} className={`${styles.button} ${styles.buttonSmall} ${styles.buttonSecondary}`} disabled={isUpdatingTags}>Cancel</button>
                  </div>
                  {tagsUpdateError && <p className={styles.errorTextSmall}>{tagsUpdateError}</p>}
                </div>
              ) : (
                <div className={styles.tagsDisplay}>
                  {task.tags && task.tags.length > 0 ? task.tags.map(tag => <span key={tag} className={styles.tagItem}>{tag}</span>) : <span>No tags.</span>}
                  <button onClick={() => { setIsEditingTags(true); setTagsUpdateError(null); }} className={`${styles.button} ${styles.buttonLink} ${styles.editIcon}`}>Edit</button>
                </div>
              )}
            </div>
          </div>
            <div className={styles.commentsSection}>
              <h3>Comments</h3>
              {isLoadingComments && <p>Loading comments...</p>}
              {errorComments && <p style={{color: 'red'}}>{errorComments}</p>}
              {!isLoadingComments && <CommentList comments={comments} />}
              <AddCommentForm taskId={task.id} onCommentAdded={handleCommentAdded} />
            </div>
          </>
        {/* The main close button for the modal */}
        <button onClick={onClose} className={styles.closeButtonModal}>Close</button>
      </div>
    </div>
  );
};
export default TaskDetailModal;
