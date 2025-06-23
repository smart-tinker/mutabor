import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import TaskCard from '../TaskCard/TaskCard'; // Adjust path
import type { ColumnDto as ProjectColumnDto, TaskDto } from '../../shared/api/projectService'; // Use TaskDto directly
import styles from './ColumnLane.module.css'; // Import CSS module

interface Column extends ProjectColumnDto {
  tasksList: TaskDto[]; // Use TaskDto
}

interface ColumnLaneProps {
  column: Column;
  onTaskClick: (task: TaskDto) => void; // New prop for task click
}

const ColumnLane: React.FC<ColumnLaneProps> = ({ column, onTaskClick }) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  // Base class for the column lane, conditionally add 'isOver' class
  const columnClasses = `${styles.columnLane} ${isOver ? styles.isOver : ''}`;

  const tasksContainerStyle = { // Kept inline as it's simple and layout-specific
    flexGrow: 1,
    minHeight: '50px',
  };

  return (
    <div ref={setNodeRef} className={columnClasses}>
      <h2 className={styles.columnTitle}>{column.name}</h2>
      <div style={tasksContainerStyle}>
        <SortableContext items={column.tasksList.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {column.tasksList.length === 0 ? (
            <p className={styles.noTasksText}>No tasks here.</p>
          ) : (
            column.tasksList.map(task => <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} />)
          )}
        </SortableContext>
      </div>
    </div>
  );
};
export default ColumnLane;
