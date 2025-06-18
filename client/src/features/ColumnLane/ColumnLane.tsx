import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import TaskCard from '../TaskCard/TaskCard'; // Adjust path
import { ColumnDto as ProjectColumnDto, TaskDto } from '../../shared/api/projectService'; // Use TaskDto directly

interface Column extends ProjectColumnDto {
  tasksList: TaskDto[]; // Use TaskDto
}

interface ColumnLaneProps {
  column: Column;
  onAddTask: (columnId: string) => void; // Function to open add task modal
  onTaskClick: (task: TaskDto) => void; // New prop for task click
}

const ColumnLane: React.FC<ColumnLaneProps> = ({ column, onAddTask, onTaskClick }) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const style = {
    border: isOver ? '2px dashed #007bff' : '1px solid #ccc',
    padding: '8px',
    minWidth: '300px', // Increased minWidth
    maxWidth: '300px', // Added maxWidth
    height: 'calc(100vh - 150px)', // Example height, adjust as needed
    overflowY: 'auto' as 'auto', // Ensure proper typing for overflowY
    background: isOver ? '#e9f5ff' : '#f9f9f9',
    display: 'flex',
    flexDirection: 'column' as 'column', // Ensure proper typing
  };

  const tasksContainerStyle = {
    flexGrow: 1,
    minHeight: '50px', // Minimum height for the droppable area of tasks
  };

  return (
    <div ref={setNodeRef} style={style}>
      <h2 style={{textAlign: 'center', marginBottom: '10px'}}>{column.name}</h2>
      <div style={tasksContainerStyle}>
        <SortableContext items={column.tasksList.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {column.tasksList.length === 0 ? (
            <p style={{ fontSize: '0.9em', color: 'grey', textAlign: 'center', marginTop: '20px' }}>No tasks here.</p>
          ) : (
            column.tasksList.map(task => <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} />)
          )}
        </SortableContext>
      </div>
      <button
        style={{ marginTop: 'auto', paddingTop: '10px', paddingBottom: '10px' }}
        onClick={() => onAddTask(column.id)}>
        + Add Task
      </button>
    </div>
  );
};
export default ColumnLane;
