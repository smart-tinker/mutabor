import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskDto } from '../../shared/api/projectService'; // Adjust path
import styles from './TaskCard.module.css'; // Import CSS Modules

interface TaskCardProps {
  task: TaskDto;
  onTaskClick: (task: TaskDto) => void; // New prop
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

  // DND-Kit styles for transform and transition
  const dndKitStyles = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cardClasses = `${styles.taskCard} ${isDragging ? styles.taskCardDragging : ''}`;

  return (
    <div
      ref={setNodeRef}
      style={dndKitStyles} // Apply DND-Kit transform/transition styles
      className={cardClasses} // Apply styles from CSS module
      {...attributes}
      {...listeners}
      onClick={() => onTaskClick(task)}
    >
      <div className={styles.taskTitle}>
        {task.humanReadableId}: {task.title}
      </div>
      {task.description && (
        <div className={styles.taskDescription}>
          {task.description}
        </div>
      )}
      {/* Example for task meta, if you add it later */}
      {/* <div className={styles.taskMeta}>
        <span>ID: {task.humanReadableId}</span>
      </div> */}
    </div>
  );
};
export default TaskCard;
