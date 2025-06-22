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

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editableTitle, setEditableTitle] = useState('');
  const [editableDescription, setEditableDescription] = useState('');
  const [editableDueDate, setEditableDueDate] = useState('');
  const [editableType, setEditableType] = useState('');
  const [editablePriority, setEditablePriority] = useState('');
  const [editableTags, setEditableTags] = useState(''); // Comma-separated string for input
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);


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

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset fields if canceling edit
      if (task) {
        setEditableTitle(task.title);
        setEditableDescription(task.description || '');
        setEditableDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
        setEditableType(task.type || '');
        setEditablePriority(task.priority || '');
        setEditableTags(task.tags ? task.tags.join(', ') : '');
      }
    }
    setIsEditing(!isEditing);
    setUpdateError(null); // Clear any previous update errors
  };

  const handleSaveChanges = async () => {
    if (!task) return;
    setIsUpdatingTask(true);
    setUpdateError(null);

    const tagsArray = editableTags.split(',').map(tag => tag.trim()).filter(tag => tag);

    const updateData: UpdateTaskDto = {
      title: editableTitle,
      description: editableDescription || undefined, // Send undefined if empty
      dueDate: editableDueDate || undefined,
      type: editableType || undefined,
      priority: editablePriority || undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
    };

    try {
      await taskService.updateTask(task.id, updateData);
      setIsEditing(false);
      // Relies on WebSocket event (task:updated) to update BoardPage and thus this modal's task prop
    } catch (error: any) {
      console.error('Failed to update task:', error);
      setUpdateError(error.message || 'Failed to update task. Please try again.');
    } finally {
      setIsUpdatingTask(false);
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
        {isEditing ? (
          // EDIT MODE
          <div className={styles.taskEditForm}>
            <h3>Edit Task</h3>
            <div>
              <label htmlFor="editTaskTitle">Title:</label>
              <input id="editTaskTitle" type="text" value={editableTitle} onChange={e => setEditableTitle(e.target.value)} className={styles.formInputFull} />
            </div>
            <div>
              <label htmlFor="editTaskDesc">Description:</label>
              <textarea id="editTaskDesc" value={editableDescription} onChange={e => setEditableDescription(e.target.value)} className={styles.formTextareaFull} />
            </div>
            <div>
              <label htmlFor="editTaskDueDate">Due Date:</label>
              <input id="editTaskDueDate" type="date" value={editableDueDate} onChange={e => setEditableDueDate(e.target.value)} className={styles.formInput} />
            </div>
            <div>
              <label htmlFor="editTaskType">Type:</label>
              <input id="editTaskType" type="text" value={editableType} onChange={e => setEditableType(e.target.value)} className={styles.formInput} placeholder="e.g., Bug, Feature"/>
            </div>
            <div>
              <label htmlFor="editTaskPriority">Priority:</label>
              <input id="editTaskPriority" type="text" value={editablePriority} onChange={e => setEditablePriority(e.target.value)} className={styles.formInput} placeholder="e.g., High, Medium, Low"/>
            </div>
            <div>
              <label htmlFor="editTaskTags">Tags (comma-separated):</label>
              <input id="editTaskTags" type="text" value={editableTags} onChange={e => setEditableTags(e.target.value)} className={styles.formInputFull} placeholder="e.g., UI, Backend"/>
            </div>
            {updateError && <p className={styles.errorText}>{updateError}</p>}
            <div className={styles.editActions}>
              <button onClick={handleEditToggle} disabled={isUpdatingTask} className={`${styles.button} ${styles.buttonSecondary}`}>Cancel</button>
              <button onClick={handleSaveChanges} disabled={isUpdatingTask} className={`${styles.button} ${styles.buttonPrimary}`}>
                {isUpdatingTask ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          // VIEW MODE
          <>
            <div className={styles.taskDetails}>
              <div className={styles.taskHeader}>
                <h2>{task.humanReadableId}: {task.title}</h2>
                <button onClick={handleEditToggle} className={`${styles.button} ${styles.buttonLink}`}>Edit</button>
              </div>
              <p className={styles.description}>{task.description || 'No description.'}</p>
              <div className={styles.metaGrid}>
                <div><strong>Due Date:</strong> {formatDate(task.dueDate)}</div>
                <div><strong>Type:</strong> {task.type || 'Not set'}</div>
                <div><strong>Priority:</strong> {task.priority || 'Not set'}</div>
              </div>
              {task.tags && task.tags.length > 0 && (
                <div className={styles.tagsDisplay}>
                  <strong>Tags:</strong>
                  {task.tags.map(tag => <span key={tag} className={styles.tagItem}>{tag}</span>)}
                </div>
              )}
            </div>
            <div className={styles.commentsSection}>
              <h3>Comments</h3>
              {isLoadingComments && <p>Loading comments...</p>}
              {errorComments && <p style={{color: 'red'}}>{errorComments}</p>}
              {!isLoadingComments && <CommentList comments={comments} />}
              <AddCommentForm taskId={task.id} onCommentAdded={handleCommentAdded} />
            </div>
          </>
        )}
        <button onClick={onClose} className={styles.closeButtonModal}>Close</button>
      </div>
    </div>
  );
};
export default TaskDetailModal;
