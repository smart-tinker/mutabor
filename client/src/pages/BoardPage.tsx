import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import type { ProjectDto as FullProjectDto, ColumnDto as ProjectColumnDto, TaskDto } from '../shared/api/projectService';
import { taskService } from '../shared/api/taskService';
import type { CreateTaskDto } from '../shared/api/taskService';
import { socket, joinProjectRoom, leaveProjectRoom } from '../shared/lib/socket';
import { Modal } from '../shared/ui/Modal';
import styles from './BoardPage.module.css';
import ColumnLane from '../features/ColumnLane/ColumnLane';
import { ManageProjectMembersModal } from '../features/ProjectMembers';
import { TaskDetailModal } from '../features/TaskDetailModal';
import { useAddTaskModal } from '../shared/contexts/AddTaskModalContext';

interface Column extends ProjectColumnDto {
  tasksList: TaskDto[];
}

interface BoardData extends Omit<FullProjectDto, 'columns' | 'tasks'> {
  columns: Column[];
}

const BoardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const { isModalOpen: isAddTaskModalOpen, closeModal: closeGlobalAddTaskModal } = useAddTaskModal();

  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskDto | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskType, setNewTaskType] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('');
  const [newTaskTags, setNewTaskTags] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

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
      if (err && err.status === 404) {
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

      const handleTaskCreated = (newTask: TaskDto) => {
        setBoardData((prevBoardData) => {
          if (!prevBoardData || newTask.projectId !== numericProjectId) return prevBoardData;
          const newColumns = prevBoardData.columns.map(column => {
            if (column.id === newTask.columnId) {
              if (column.tasksList.find(task => task.id === newTask.id)) return column;
              return { ...column, tasksList: [...column.tasksList, newTask].sort((a,b) => a.position - b.position) };
            }
            return column;
          });
          return { ...prevBoardData, columns: newColumns };
        });
      };

      const handleTaskMoved = (movedTask: TaskDto) => {
        setBoardData(prev => {
            if (!prev || movedTask.projectId !== numericProjectId) return prev;
            let newColumns = JSON.parse(JSON.stringify(prev.columns)) as Column[];
            newColumns = newColumns.map(col => ({
                ...col,
                tasksList: col.tasksList.filter(t => t.id !== movedTask.id)
            }));
            const targetColumnIndex = newColumns.findIndex(col => col.id === movedTask.columnId);
            if (targetColumnIndex !== -1) {
                newColumns[targetColumnIndex].tasksList.push(movedTask);
                newColumns[targetColumnIndex].tasksList.sort((a, b) => a.position - b.position);
            }
            return { ...prev, columns: newColumns };
        });
      };

      const handleTaskUpdated = (updatedTask: TaskDto) => {
        setBoardData(prev => {
            if (!prev || updatedTask.projectId !== numericProjectId) return prev;
            const newColumns = prev.columns.map(col => {
                const taskIndex = col.tasksList.findIndex(t => t.id === updatedTask.id);
                if (taskIndex !== -1) {
                    const updatedTasksList = [...col.tasksList];
                    updatedTasksList[taskIndex] = updatedTask;
                    return { ...col, tasksList: updatedTasksList.sort((a,b) => a.position - b.position) };
                }
                return col;
            });
            return { ...prev, columns: newColumns };
        });
      };

      socket.on('task:created', handleTaskCreated);
      socket.on('task:moved', handleTaskMoved);
      socket.on('task:updated', handleTaskUpdated);

      return () => {
        socket.off('connect', onConnect);
        socket.off('task:created', handleTaskCreated);
        socket.off('task:moved', handleTaskMoved);
        socket.off('task:updated', handleTaskUpdated);
        if (projectId) leaveProjectRoom(projectId);
      };
    }
  }, [projectId, fetchBoardData, numericProjectId]);

  useEffect(() => {
    if (isAddTaskModalOpen && boardData && boardData.columns.length > 0) {
      if (!selectedColumnId || !boardData.columns.find(col => col.id === selectedColumnId)) {
        setSelectedColumnId(boardData.columns[0].id);
      }
    }
  }, [isAddTaskModalOpen, boardData, selectedColumnId]);

  const resetAddTaskForm = () => {
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskDueDate('');
    setNewTaskType('');
    setNewTaskPriority('');
    setNewTaskTags('');
  };

  const handleModalClose = () => {
    resetAddTaskForm();
    closeGlobalAddTaskModal();
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedColumnId || numericProjectId === null) {
      alert('Please ensure Title and Column are filled.');
      return;
    }
    setIsCreatingTask(true);
    try {
      const tagsArray = newTaskTags.split(',').map(tag => tag.trim()).filter(Boolean);
      const taskData: CreateTaskDto = {
        title: newTaskTitle,
        description: newTaskDescription,
        columnId: selectedColumnId,
        projectId: numericProjectId,
        dueDate: newTaskDueDate || undefined,
        type: newTaskType || undefined,
        priority: newTaskPriority || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      };
      await taskService.createTask(taskData);
      handleModalClose();
    } catch (err) {
      console.error('Failed to create task:', err);
      alert('Failed to create task.');
    } finally {
      setIsCreatingTask(false);
    }
  };

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
      alert('Failed to move task. Reverting changes.');
      fetchBoardData();
    }
  };

  if (isLoading && !boardData) return <p>Loading board...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!boardData) return <p>No board data found or project ID is invalid.</p>;

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px' }}>
            <h1>{boardData.name}{boardData.prefix ? ` (${boardData.prefix})` : ''}</h1>
            <button
              onClick={() => setIsMembersModalOpen(true)}
              style={{ padding: '8px 15px', cursor: 'pointer' }}
            >
              Manage Members
            </button>
          </div>
          {selectedColumnId && (
            <Modal
              isOpen={isAddTaskModalOpen}
              onClose={handleModalClose}
              title="Add New Task"
            >
              <form onSubmit={handleCreateTask} className={styles.form}>
                <div>
                  <label htmlFor="taskTitle" className={styles.formLabel}>Task Title:</label>
                  <input id="taskTitle" type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} required className={styles.formInput} />
                </div>
                <div>
                  <label htmlFor="taskDescription">Description (Optional):</label>
                  <textarea id="taskDescription" value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} className={styles.formTextarea} />
                </div>
                <div>
                  <label htmlFor="columnSelect" className={styles.formLabel}>Status/Column:</label>
                  <select id="columnSelect" value={selectedColumnId || ''} onChange={(e) => setSelectedColumnId(e.target.value)} required className={styles.formSelect}>
                    <option value="" disabled>Select a column</option>
                    {boardData?.columns.map(column => (<option key={column.id} value={column.id}>{column.name}</option>))}
                  </select>
                </div>
                <div>
                  <label htmlFor="taskDueDate" className={styles.formLabel}>Deadline:</label>
                  <input id="taskDueDate" type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className={styles.formInput} />
                </div>
                <div>
                  <label htmlFor="taskType" className={styles.formLabel}>Type:</label>
                  <input id="taskType" type="text" value={newTaskType} onChange={(e) => setNewTaskType(e.target.value)} className={styles.formInput} placeholder="e.g., Bug, Feature, Chore" />
                </div>
                <div>
                  <label htmlFor="taskPriority" className={styles.formLabel}>Priority:</label>
                  <input id="taskPriority" type="text" value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)} className={styles.formInput} placeholder="e.g., High, Medium, Low" />
                </div>
                <div>
                  <label htmlFor="taskTags" className={styles.formLabel}>Tags (comma-separated):</label>
                  <input id="taskTags" type="text" value={newTaskTags} onChange={(e) => setNewTaskTags(e.target.value)} className={styles.formInput} placeholder="e.g., UI, Backend, Urgent" />
                </div>
                <div className={styles.formActions}>
                  <button type="button" onClick={handleModalClose} className={`${styles.button} ${styles.buttonSecondary}`}>Cancel</button>
                  <button type="submit" disabled={isCreatingTask || !selectedColumnId} className={`${styles.button} ${styles.buttonPrimary}`}>
                    {isCreatingTask ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </form>
            </Modal>
          )}
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '10px', minHeight: 'calc(100vh - 100px)' }}>
            {boardData.columns.map((column) => (
              <ColumnLane key={column.id} column={column} onTaskClick={handleTaskClick} />
            ))}
          </div>
        </div>
      </DndContext>
      {numericProjectId !== null && (
        <ManageProjectMembersModal
            projectId={numericProjectId}
            isOpen={isMembersModalOpen}
            onClose={() => setIsMembersModalOpen(false)}
        />
      )}
      {selectedTask && numericProjectId !== null && (
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