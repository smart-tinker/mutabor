import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskDto } from '../../shared/api/projectService'; // CORRECTED PATH
import styles from './TaskCard.module.css';

interface TaskCardProps {
  task: TaskDto;
  onTaskClick: (task: TaskDto) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onTaskClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const dndKitStyles = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cardClasses = `${styles.taskCard} ${isDragging ? styles.taskCardDragging : ''}`;

  return (
    <div
      ref={setNodeRef}
      style={dndKitStyles}
      className={cardClasses}
      {...attributes}
      {...listeners}
      onClick={() => onTaskClick(task)}
    >
      <div className={styles.taskTitle}>
        {`${task.human_readable_id ? `${task.human_readable_id}: ` : ''}${task.title}`}
      </div>
      {task.description && (
        <div className={styles.taskDescription}>
          {task.description}
        </div>
      )}
      <div className={styles.taskMeta}>
        {task.priority && (
          <span className={`${styles.metaItem} ${styles.priority} ${styles['priority' + task.priority.charAt(0).toUpperCase() + task.priority.slice(1)]}`}>
            Priority: {task.priority}
          </span>
        )}
        {task.due_date && (
          <span className={styles.metaItem}>
            Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
          </span>
        )}
      </div>
      {task.tags && task.tags.length > 0 && (
        <div className={styles.tagsContainer}>
          {task.tags.slice(0, 3).map((tag: string) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
          {task.tags.length > 3 && (
            <span className={styles.tagMore}>+{task.tags.length - 3} more</span>
          )}
        </div>
      )}
    </div>
  );
};
export default TaskCard;