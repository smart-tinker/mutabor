import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { taskService, TaskDto, CommentDto as ApiCommentDto } from '../shared/api/taskService'; // Предполагается, что TaskDto и CommentDto экспортируются отсюда
import { transformCommentDto } from '../shared/api/taskService'; // Для трансформации комментариев
import { CommentList, AddCommentForm } from '../features/Comments'; // Компоненты для комментариев
import styles from './TaskPage.module.css'; // Стили для страницы

// Интерфейс для комментариев после трансформации, если отличается от ApiCommentDto
interface DisplayCommentDto extends Omit<ApiCommentDto, 'created_at' | 'updated_at' | 'author_id' | 'task_id'> {
  id: number;
  content: string;
  author: { id: number; username: string; avatarUrl?: string };
  createdAt: Date;
  updatedAt: Date;
  taskId: number;
}


const TaskPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<TaskDto | null>(null);
  const [comments, setComments] = useState<DisplayCommentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTaskDetails = async () => {
      if (!taskId) return;
      setIsLoading(true);
      setError(null);
      try {
        const numericTaskId = parseInt(taskId, 10);
        if (isNaN(numericTaskId)) {
          setError('Invalid Task ID');
          setIsLoading(false);
          return;
        }
        // Загрузка данных задачи
        const taskData = await taskService.getTaskById(numericTaskId);
        setTask(taskData);

        // Загрузка комментариев к задаче
        const commentsData = await taskService.getCommentsByTaskId(numericTaskId);
        // Трансформация комментариев, если это необходимо (например, формат даты, структура автора)
        const transformedComments = commentsData.map(transformCommentDto);
        setComments(transformedComments);

      } catch (err) {
        setError('Failed to load task details.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTaskDetails();
  }, [taskId]);

  const handleCommentAdded = (newComment: DisplayCommentDto) => {
    // Это callback для AddCommentForm, он должен принимать DisplayCommentDto
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

  // Basic date formatter
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    });
  };


  return (
    <div className={styles.pageContainer}>
      <div className={styles.taskContent}>
        <h1 className={styles.taskTitle}>{task.humanReadableId}: {task.title}</h1>

        <div className={styles.taskMeta}>
          <p><strong>Status:</strong> {task.status}</p>
          <p><strong>Priority:</strong> {task.priority || 'Not set'}</p>
          <p><strong>Type:</strong> {task.type || 'Not set'}</p>
          <p><strong>Due Date:</strong> {formatDate(task.dueDate)}</p>
          <p><strong>Created At:</strong> {formatDate(task.createdAt)}</p>
          <p><strong>Updated At:</strong> {formatDate(task.updatedAt)}</p>
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
              {task.tags.map(tag => <span key={tag} className={styles.tagItem}>{tag}</span>)}
            </div>
          </div>
        )}

        {/* TODO: Отображение других полей задачи, если необходимо, например, исполнитель, проект */}
        {/* <p><strong>Assignee:</strong> {task.assignee ? task.assignee.username : 'Unassigned'}</p> */}
        {/* <p><strong>Project:</strong> {task.project ? task.project.name : 'N/A'}</p> */}

      </div>

      <div className={styles.commentsSection}>
        <h2>Comments</h2>
        <CommentList comments={comments} />
        <AddCommentForm taskId={task.id} onCommentAdded={handleCommentAdded as any} />
        {/* Используем 'as any' временно, т.к. onCommentAdded ожидает DisplayCommentDto, а AddCommentForm может возвращать ApiCommentDto */}
        {/* В идеале, AddCommentForm должен быть адаптирован или должна быть обертка для трансформации */}
      </div>
    </div>
  );
};

export default TaskPage;
