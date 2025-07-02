// client/src/pages/TaskPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { taskService } from '../shared/api/taskService';
// ### ИЗМЕНЕНИЕ: Импортируем типы из правильного места ###
import type { CommentDto } from '../shared/api/types';
import type { TaskDto } from '../shared/api/projectService';
import { CommentList, AddCommentForm } from '../features/Comments';
import styles from './TaskPage.module.css';

const TaskPage: React.FC = () => {
  // ### ИЗМЕНЕНИЕ: Получаем taskHid из URL
  const { taskHid } = useParams<{ taskHid: string }>();
  const [task, setTask] = useState<TaskDto | null>(null);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTaskDetails = async () => {
      if (!taskHid) return;
      setIsLoading(true);
      setError(null);
      try {
        // ### ИЗМЕНЕНИЕ: Вызываем правильный метод для получения задачи по HID
        const taskData = await taskService.getTaskByHumanId(taskHid);
        setTask(taskData);

        // ### ИЗМЕНЕНИЕ: Получаем комментарии после того, как получили задачу и ее UUID
        const commentsData = await taskService.getTaskComments(taskData.id);
        setComments(commentsData);

      } catch (err) {
        setError('Failed to load task details.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTaskDetails();
  }, [taskHid]);

  const handleCommentAdded = (newComment: CommentDto) => {
    setComments(prevComments =>
      [...prevComments, newComment].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    );
  };

  if (isLoading) {
    return <div className={styles.container}><p>Loading task details...</p></div>;
  }

  if (error) {
    return <div className={styles.container}><p className={styles.errorText}>{error}</p></div>;
  }

  if (!task) {
    return <div className={styles.container}><p>Task not found.</p></div>;
  }

  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    });
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.taskContent}>
        <h1 className={styles.taskTitle}>{task.human_readable_id}: {task.title}</h1>

        <div className={styles.taskMeta}>
          <p><strong>Priority:</strong> {task.priority || 'Not set'}</p>
          <p><strong>Type:</strong> {task.type || 'Not set'}</p>
          <p><strong>Due Date:</strong> {formatDate(task.due_date)}</p>
          <p><strong>Created At:</strong> {formatDate(task.created_at)}</p>
          <p><strong>Updated At:</strong> {formatDate(task.updated_at)}</p>
        </div>

        {task.description && (
          <div className={styles.taskDescription}>
            <h3>Description</h3>
            <p>{task.description}</p>
          </div>
        )}

        {task.tags && task.tags.length > 0 && (
          <div className={styles.taskTags}>
            <h3>Tags</h3>
            <div className={styles.tagsContainer}>
              {task.tags.map((tag: string) => <span key={tag} className={styles.tagItem}>{tag}</span>)}
            </div>
          </div>
        )}
      </div>

      <div className={styles.commentsSection}>
        <h2>Comments</h2>
        <CommentList comments={comments} />
        <AddCommentForm taskId={task.id} onCommentAdded={handleCommentAdded} />
      </div>
    </div>
  );
};

export default TaskPage;