// client/src/features/TaskDetailModal/ui/TaskDetailModal.tsx
import React, { useEffect, useState, useCallback } from 'react';
// Use CommentDto from taskService, TaskDto from projectService
import type { TaskDto } from '../../../shared/api/projectService';
import type { CommentDto, ApiCommentDto } from '../../../shared/api/taskService';
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

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.taskDetails}>
          <h2>{task.humanReadableId}: {task.title}</h2>
          <p>{task.description || 'No description.'}</p>
          {/* Add more task details here: Assignee, Due Date, etc. */}
        </div>
        <div className={styles.commentsSection}>
          <h3>Comments</h3>
          {isLoadingComments && <p>Loading comments...</p>}
          {errorComments && <p style={{color: 'red'}}>{errorComments}</p>}
          {!isLoadingComments && <CommentList comments={comments} />}
          <AddCommentForm taskId={task.id} onCommentAdded={handleCommentAdded} />
        </div>
        <button onClick={onClose} className={styles.closeButton}>Close</button>
      </div>
    </div>
  );
};
export default TaskDetailModal;
