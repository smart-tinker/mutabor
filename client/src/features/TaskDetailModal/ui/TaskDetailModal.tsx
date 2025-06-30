// client/src/features/TaskDetailModal/ui/TaskDetailModal.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { TaskDto } from '../../../shared/api/projectService';
import { taskService } from '../../../shared/api/taskService';
import type { UpdateTaskDto, CommentDto, ApiCommentDto } from '../../../shared/api/taskService';
import { transformCommentDto } from '../../../shared/api/taskService';

import { getTaskComments } from '../../Comments/api';
import { CommentList, AddCommentForm } from '../../Comments';
import { socket } from '../../../shared/lib/socket';
import styles from './TaskDetailModal.module.css';
import EditableField from './EditableField';

interface TaskDetailModalProps {
  task: TaskDto | null;
  isOpen: boolean;
  onClose: () => void;
  projectId: number | null;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, isOpen, onClose, projectId }) => {
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [errorComments, setErrorComments] = useState<string | null>(null);

  const [editableTitle, setEditableTitle] = useState('');
  const [editableDescription, setEditableDescription] = useState('');
  const [editableDueDate, setEditableDueDate] = useState('');
  const [editableType, setEditableType] = useState('');
  const [editablePriority, setEditablePriority] = useState('');
  const [editableTags, setEditableTags] = useState('');

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [isEditingType, setIsEditingType] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);

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

  useEffect(() => {
    if (task) {
      if (!isEditingTitle) setEditableTitle(task.title);
      if (!isEditingDescription) setEditableDescription(task.description || '');
      if (!isEditingDueDate) setEditableDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');
      if (!isEditingType) setEditableType(task.type || '');
      if (!isEditingPriority) setEditablePriority(task.priority || '');
      if (!isEditingTags) setEditableTags(task.tags ? task.tags.join(', ') : '');
    }
  }, [task, isOpen, isEditingTitle, isEditingDescription, isEditingDueDate, isEditingType, isEditingPriority, isEditingTags]);

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
      if (newComment.task_id === task.id) {
        const commentToDisplay = transformCommentDto(newComment);
        setComments(prev => [...prev.filter(c => c.id !== commentToDisplay.id), commentToDisplay].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
      }
    };
    socket.on('comment:created', handleCommentCreated);
    return () => {
      socket.off('comment:created', handleCommentCreated);
    };
  }, [isOpen, task, projectId]);

  const handleCommentAdded = (newComment: CommentDto) => {
    setComments(prevComments => [...prevComments, newComment].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
  };

  if (!isOpen || !task) return null;

  const handleSaveField = async (
    fieldName: string,
    updateDtoPartial: Partial<UpdateTaskDto>,
    setIsUpdating: React.Dispatch<React.SetStateAction<boolean>>,
    setUpdateError: React.Dispatch<React.SetStateAction<string | null>>,
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (!task) return;
    setIsUpdating(true);
    setUpdateError(null);
    try {
      await taskService.updateTask(task.id, updateDtoPartial);
      setIsEditing(false);
    } catch (error: any) {
      setUpdateError(error.message || `Failed to update ${fieldName}.`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveTitle = async () => handleSaveField('title', { title: editableTitle }, setIsUpdatingTitle, setTitleUpdateError, setIsEditingTitle);
  const handleSaveDescription = async () => handleSaveField('description', { description: editableDescription }, setIsUpdatingDescription, setDescriptionUpdateError, setIsEditingDescription);
  const handleSaveDueDate = async () => handleSaveField('dueDate', { dueDate: editableDueDate || null }, setIsUpdatingDueDate, setDueDateUpdateError, setIsEditingDueDate);
  const handleSaveType = async () => handleSaveField('type', { type: editableType }, setIsUpdatingType, setTypeUpdateError, setIsEditingType);
  const handleSavePriority = async () => handleSaveField('priority', { priority: editablePriority }, setIsUpdatingPriority, setPriorityUpdateError, setIsEditingPriority);
  const handleSaveTags = async () => {
    const tagsArray = editableTags.trim() ? editableTags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    await handleSaveField('tags', { tags: tagsArray }, setIsUpdatingTags, setTagsUpdateError, setIsEditingTags);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <>
          <div className={styles.taskDetails}>
            <div className={styles.taskHeader}>
              <h2>
                {isEditingTitle ? (
                  <>
                    <span>{task.human_readable_id}: </span>
                    <EditableField
                      value={task.title}
                      editableValue={editableTitle}
                      isEditing={true}
                      isUpdating={isUpdatingTitle}
                      error={titleUpdateError}
                      onEdit={() => {}}
                      onCancel={() => { setIsEditingTitle(false); setEditableTitle(task.title); setTitleUpdateError(null); }}
                      onSave={handleSaveTitle}
                      onChange={(e) => setEditableTitle(e.target.value)}
                      inputType="text"
                      editModeClassName={styles.inlineEditSection}
                      inputSpecificClassName={styles.formInputFull}
                      controlsClassName={styles.inlineEditSectionControls}
                    />
                  </>
                ) : (
                  <>
                    <span>{task.human_readable_id}: {task.title}</span>
                    <button onClick={() => { setIsEditingTitle(true); setTitleUpdateError(null); }} className={`${styles.button} ${styles.buttonLink} ${styles.editIcon}`}>Edit</button>
                  </>
                )}
              </h2>
            </div>
            <div className={styles.description}>
              <EditableField
                value={task.description}
                editableValue={editableDescription}
                isEditing={isEditingDescription}
                isUpdating={isUpdatingDescription}
                error={descriptionUpdateError}
                onEdit={() => { setIsEditingDescription(true); setDescriptionUpdateError(null); }}
                onCancel={() => { setIsEditingDescription(false); setEditableDescription(task.description || ''); setDescriptionUpdateError(null); }}
                onSave={handleSaveDescription}
                onChange={(e) => setEditableDescription(e.target.value)}
                inputType="textarea"
                viewModeClassName={styles.descriptionView}
                valueTextClassName={styles.descriptionText}
                valueAreaClassName={styles.defaultValueArea}
                editModeClassName={styles.inlineEditSection}
                inputSpecificClassName={styles.formTextareaFull}
                controlsClassName={styles.inlineEditSectionControls}
              />
            </div>
            <div className={styles.metaGrid}>
              <EditableField
                label="Due Date:" value={task.due_date} editableValue={editableDueDate} isEditing={isEditingDueDate}
                isUpdating={isUpdatingDueDate} error={dueDateUpdateError} onEdit={() => { setIsEditingDueDate(true); setDueDateUpdateError(null); }}
                onCancel={() => { setIsEditingDueDate(false); setEditableDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''); setDueDateUpdateError(null); }}
                onSave={handleSaveDueDate} onChange={(e) => setEditableDueDate(e.target.value)} inputType="date" valueDisplayFormatter={(val) => formatDate(val as string | undefined)}
                viewModeClassName={styles.metaGridItem} labelClassName={styles.metaGridItemLabel} valueAreaClassName={styles.metaGridItemValueArea}
                valueTextClassName={styles.metaGridItemValueText} editModeClassName={styles.inlineEditSectionCompact} inputSpecificClassName={styles.formInput}
                controlsClassName={styles.inlineEditSectionCompactControls}
              />
              <EditableField
                label="Type:" value={task.type} editableValue={editableType} isEditing={isEditingType} isUpdating={isUpdatingType}
                error={typeUpdateError} onEdit={() => { setIsEditingType(true); setTypeUpdateError(null); }}
                onCancel={() => { setIsEditingType(false); setEditableType(task.type || ''); setTypeUpdateError(null); }} onSave={handleSaveType}
                onChange={(e) => setEditableType(e.target.value)} inputPlaceholder="e.g., Bug, Feature" viewModeClassName={styles.metaGridItem}
                labelClassName={styles.metaGridItemLabel} valueAreaClassName={styles.metaGridItemValueArea} valueTextClassName={styles.metaGridItemValueText}
                editModeClassName={styles.inlineEditSectionCompact} inputSpecificClassName={styles.formInput} controlsClassName={styles.inlineEditSectionCompactControls}
              />
              <EditableField
                label="Priority:" value={task.priority} editableValue={editablePriority} isEditing={isEditingPriority} isUpdating={isUpdatingPriority}
                error={priorityUpdateError} onEdit={() => { setIsEditingPriority(true); setPriorityUpdateError(null); }}
                onCancel={() => { setIsEditingPriority(false); setEditablePriority(task.priority || ''); setPriorityUpdateError(null); }}
                onSave={handleSavePriority} onChange={(e) => setEditablePriority(e.target.value)} inputPlaceholder="e.g., High, Medium, Low"
                viewModeClassName={styles.metaGridItem} labelClassName={styles.metaGridItemLabel} valueAreaClassName={styles.metaGridItemValueArea}
                valueTextClassName={styles.metaGridItemValueText} editModeClassName={styles.inlineEditSectionCompact} inputSpecificClassName={styles.formInput}
                controlsClassName={styles.inlineEditSectionCompactControls}
              />
            </div>
            <div className={styles.tagsSection}>
              <EditableField
                label="Tags:" value={task.tags} editableValue={editableTags} isEditing={isEditingTags} isUpdating={isUpdatingTags}
                error={tagsUpdateError} onEdit={() => { setIsEditingTags(true); setTagsUpdateError(null); }}
                onCancel={() => { setIsEditingTags(false); setEditableTags(task.tags ? task.tags.join(', ') : ''); setTagsUpdateError(null); }}
                onSave={handleSaveTags} onChange={(e) => setEditableTags(e.target.value)} inputPlaceholder="e.g., UI, Backend"
                labelClassName={styles.tagsSectionLabel} valueAreaClassName={styles.tagsViewArea} editModeClassName={styles.inlineEditSection}
                inputSpecificClassName={styles.formInputFull} controlsClassName={styles.inlineEditSectionControls}
              >
                <div className={styles.tagsDisplay}>
                  {task.tags && task.tags.length > 0 ? task.tags.map(tag => <span key={tag} className={styles.tagItem}>{tag}</span>) : <span>No tags.</span>}
                </div>
              </EditableField>
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
        <div className={styles.modalActions}>
          {/* ### ИЗМЕНЕНИЕ: Ссылка теперь указывает на правильный маршрут /tasks/HID ### */}
          <Link to={`/tasks/${task.human_readable_id}`} className={`${styles.button} ${styles.buttonLink}`}>
            Open in New Page
          </Link>
          <button onClick={onClose} className={`${styles.button} ${styles.closeButtonModal}`}>Close</button>
        </div>
      </div>
    </div>
  );
};
export default TaskDetailModal;