import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { taskService } from '../shared/api/taskService';
import type { TaskDto, CommentDto } from '../shared/api/taskService'; // Используем type import, ensure CommentDto is imported
// import { transformCommentDto } from '../shared/api/taskService'; // No longer needed
import { CommentList, AddCommentForm } from '../features/Comments'; // Компоненты для комментариев
import styles from './TaskPage.module.css'; // Стили для страницы

// DisplayCommentDto is no longer needed, using CommentDto directly for state.

const TaskPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<TaskDto | null>(null);
  const [comments, setComments] = useState<CommentDto[]>([]); // Changed to CommentDto[]
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTaskDetails = async () => {
      if (!taskId) return;
      setIsLoading(true);
      setError(null);
      try {
        // const numericTaskId = parseInt(taskId, 10); // No longer needed, taskId is used as string
        // if (isNaN(numericTaskId)) { // This check might still be useful if taskId can be non-numeric string
        //   setError('Invalid Task ID format');
        //   setIsLoading(false);
        //   return;
        // }
        // Загрузка данных задачи
        const taskData = await taskService.getTaskById(taskId);
        setTask(taskData);

        // Загрузка комментариев к задаче
        const commentsData = await taskService.getTaskComments(taskId); // Исправлено, using string taskId
        // commentsData is already CommentDto[] as getTaskComments handles the transformation.
        // DisplayCommentDto is now compatible with CommentDto.
        setComments(commentsData);

      } catch (err) {
        setError('Failed to load task details.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTaskDetails();
  }, [taskId]);

  // handleCommentAdded now receives a CommentDto directly, as AddCommentForm calls it
  // with the result of taskService.addTaskComment (which returns CommentDto)
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

  // Basic date formatter
  const formatDate = (dateString?: string | Date | null) => {
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
              {task.tags.map((tag: string) => <span key={tag} className={styles.tagItem}>{tag}</span>)}
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
        <AddCommentForm taskId={task.id} onCommentAdded={handleCommentAdded} />
      </div>
    </div>
  );
};

export default TaskPage;
