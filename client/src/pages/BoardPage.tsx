import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  DndContext,
  closestCorners,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';

import { projectService } from '../shared/api/projectService';
import type { FullProjectDto, ColumnDto as ProjectColumnDto, TaskDto } from '../shared/api/projectService';
import { taskService } from '../shared/api/taskService';
import { socket, joinProjectRoom, leaveProjectRoom } from '../shared/lib/socket';

import styles from './BoardPage.module.css';
import ColumnLane from '../features/ColumnLane/ColumnLane';
import { TaskDetailModal } from '../features/TaskDetailModal';
import { AddTaskModal } from '../features/AddTaskModal';

interface Column extends ProjectColumnDto {
  tasksList: TaskDto[];
}

interface BoardData extends Omit<FullProjectDto, 'columns'> {
  columns: Column[];
}

const BoardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskDto | null>(null);

  const numericProjectId = projectId ? parseInt(projectId, 10) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const fetchBoardData = useCallback(async () => {
    if (numericProjectId === null || isNaN(numericProjectId)) {
        setError("Invalid Project ID format.");
        setIsLoading(false);
        return;
    }
    try {
      setIsLoading(true);
      const projectDetails = await projectService.getProjectById(numericProjectId);
      const transformedColumns = projectDetails.columns?.map(col => ({
        ...col,
        tasksList: col.tasks?.sort((a, b) => a.position - b.position) || [],
      })).sort((a,b) => a.position - b.position) || [];

      if (!projectDetails || Object.keys(projectDetails).length === 0) {
        navigate('/404');
        return;
      }

      setBoardData({ ...projectDetails, columns: transformedColumns });
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 404) {
        navigate('/404');
      } else {
        setError('Failed to fetch board data.');
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [numericProjectId, navigate]);

  useEffect(() => {
    fetchBoardData();
    if (projectId) {
      if (!socket.connected) socket.connect();

      const onConnect = () => joinProjectRoom(projectId);
      socket.once('connect', onConnect);
      if (socket.connected) onConnect();

      const handleTaskEvent = (task: TaskDto) => {
        setBoardData((prev) => {
          if (!prev || task.project_id !== numericProjectId) return prev;
      
          let newColumns = JSON.parse(JSON.stringify(prev.columns)) as Column[];
      
          // Remove task from its old position in all cases
          newColumns = newColumns.map(col => ({
            ...col,
            tasksList: col.tasksList.filter(t => t.id !== task.id)
          }));
      
          // Add/Update task in its new/current column
          const targetColumnIndex = newColumns.findIndex(col => col.id === task.column_id);
          if (targetColumnIndex !== -1) {
            newColumns[targetColumnIndex].tasksList.push(task);
            // Always sort the tasks in the affected column
            newColumns[targetColumnIndex].tasksList.sort((a, b) => a.position - b.position);
          }
      
          return { ...prev, columns: newColumns };
        });
      };
      
      socket.on('task:created', handleTaskEvent);
      socket.on('task:moved', handleTaskEvent);
      socket.on('task:updated', handleTaskEvent);

      return () => {
        socket.off('connect', onConnect);
        socket.off('task:created', handleTaskEvent);
        socket.off('task:moved', handleTaskEvent);
        socket.off('task:updated', handleTaskEvent);
        if (projectId) leaveProjectRoom(projectId);
      };
    }
  }, [projectId, fetchBoardData, numericProjectId]);


  const handleTaskClick = (task: TaskDto) => {
    setSelectedTask(task);
  };

  const findColumnContainingTask = (taskId: string): Column | undefined => {
    return boardData?.columns.find(column => column.tasksList.some(task => task.id === taskId));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !boardData) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeColumn = findColumnContainingTask(activeId);
    const overColumn = boardData.columns.find(col => col.id === overId) || findColumnContainingTask(overId);

    if (!activeColumn || !overColumn) return;

    const activeTask = activeColumn.tasksList.find(t => t.id === activeId);
    if (!activeTask) return;

    setBoardData(prev => {
      if (!prev) return null;
      const columnsCopy = JSON.parse(JSON.stringify(prev.columns)) as Column[];
      const sourceColIndex = columnsCopy.findIndex(c => c.id === activeColumn.id);
      const destColIndex = columnsCopy.findIndex(c => c.id === overColumn.id);
      const sourceTaskIndex = columnsCopy[sourceColIndex].tasksList.findIndex(t => t.id === activeId);
      const [movedTask] = columnsCopy[sourceColIndex].tasksList.splice(sourceTaskIndex, 1);
      let destTaskIndex = columnsCopy[destColIndex].tasksList.findIndex(t => t.id === overId);
      if (destTaskIndex === -1) {
        destTaskIndex = columnsCopy[destColIndex].tasksList.length;
      }
      columnsCopy[destColIndex].tasksList.splice(destTaskIndex, 0, movedTask);
      return { ...prev, columns: columnsCopy };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (!over || !boardData) {
      fetchBoardData();
      return;
    }

    const activeId = active.id as string;
    const finalParentColumn = boardData.columns.find(col => col.tasksList.some(task => task.id === activeId));
    if (!finalParentColumn) {
      fetchBoardData();
      return;
    }

    const newColumnId = finalParentColumn.id;
    const newPosition = finalParentColumn.tasksList.findIndex(task => task.id === activeId);

    if (newPosition === -1) {
      fetchBoardData();
      return;
    }

    try {
      await taskService.moveTask(activeId, { newColumnId, newPosition });
    } catch (err) {
      console.error('Failed to move task:', err);
      setError('Failed to save task position. Reverting changes.');
      fetchBoardData();
    }
  };

  if (isLoading && !boardData) return <p>Loading board...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!boardData || !numericProjectId) return <p>No board data found or project ID is invalid.</p>;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div>
          <div className={styles.pageHeader}>
            <h1>{boardData.name}{boardData.task_prefix ? ` (${boardData.task_prefix})` : ''}</h1>
            <Link to={`/projects/${numericProjectId}/settings`} className="button secondary">
                Project Settings ⚙️
            </Link>
          </div>
          <AddTaskModal projectId={numericProjectId} columns={boardData.columns} />
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '10px', minHeight: 'calc(100vh - 100px)' }}>
            {boardData.columns.map((column) => (
              <ColumnLane key={column.id} column={column} onTaskClick={handleTaskClick} />
            ))}
          </div>
        </div>
      </DndContext>
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          projectId={numericProjectId}
        />
      )}
      <DragOverlay>{activeDragId ? <div style={{ border: '1px solid gray', padding: '10px', backgroundColor: 'lightyellow' }}>Dragging Task</div> : null}</DragOverlay>
    </>
  );
};
export default BoardPage;