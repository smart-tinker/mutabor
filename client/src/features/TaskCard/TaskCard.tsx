import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskDto } from '../../shared/api/projectService'; // Adjust path

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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    border: '1px solid #eee',
    padding: '8px',
    margin: '4px 0',
    backgroundColor: 'white',
    cursor: 'grab',
    boxShadow: isDragging ? '0px 5px 15px rgba(0,0,0,0.1)' : 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={() => onTaskClick(task)}>
      <strong>{task.humanReadableId}</strong>: {task.title}
      {task.description && <p style={{ fontSize: '0.8em', whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{task.description?.substring(0,100)}...</p>}
    </div>
  );
};
export default TaskCard;
