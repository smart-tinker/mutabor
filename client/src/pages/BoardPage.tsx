import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Add useNavigate
import {
  DndContext,
  closestCorners,
  DragOverlay, // Import DragOverlay
  PointerSensor,
  useSensor,
  useSensors,
  // Active, // Not explicitly used, but part of dnd-kit core concepts
  // Over // Not explicitly used
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
// import { arrayMove } from '@dnd-kit/sortable'; // Not used
// import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers'; // Optional modifiers

import { projectService } from '../shared/api/projectService'; // Use TaskDto from projectService
import type { ProjectDto as FullProjectDto, ColumnDto as ProjectColumnDto, TaskDto } from '../shared/api/projectService';
import { taskService } from '../shared/api/taskService';
import type { CreateTaskDto } from '../shared/api/taskService';
import { socket, joinProjectRoom, leaveProjectRoom } from '../shared/lib/socket';
import { Modal } from '../shared/ui/Modal'; // Import the new Modal
import ColumnLane from '../features/ColumnLane/ColumnLane'; // Import ColumnLane
import { ManageProjectMembersModal } from '../features/ProjectMembers'; // Import ManageProjectMembersModal
import { TaskDetailModal } from '../features/TaskDetailModal'; // Import TaskDetailModal

// interfaces Column, BoardData as before
interface Column extends ProjectColumnDto {
  tasksList: TaskDto[]; // Ensure this uses the imported TaskDto
}

interface BoardData extends Omit<FullProjectDto, 'columns' | 'tasks'> {
  columns: Column[];
}


const BoardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate(); // Add this
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null); // Re-add activeDragId

  // state for AddTaskModal as before
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false); // State for members modal
  const [selectedTask, setSelectedTask] = useState<TaskDto | null>(null); // State for selected task
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
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
      // If projectDetails could be null/undefined for a 404 without throwing, that logic would go here.
      // Assuming projectService.getProjectById throws an error for 404s.
      const transformedColumns = projectDetails.columns?.map(col => ({
        ...col,
        tasksList: col.tasks?.sort((a, b) => a.position - b.position) || [],
      })).sort((a,b) => a.position - b.position) || [];

      if (!projectDetails || Object.keys(projectDetails).length === 0) {
        // Handle cases where API might return empty object or null for not found, instead of throwing 404.
        // This is a defensive check. Ideally, the service throws a proper error.
        navigate('/404');
        return;
      }

      setBoardData({ ...projectDetails, columns: transformedColumns });
      setError(null);
    } catch (err: any) { // Explicitly type err as any to access status, or define a more specific error type
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
      if (socket.connected) onConnect(); // If already connected, join immediately

      const handleTaskCreated = (newTask: TaskDto) => { // Use imported TaskDto
        console.log('task:created event received', newTask);
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

      const handleTaskMoved = (movedTask: TaskDto) => { // Use imported TaskDto
        console.log('task:moved event received', movedTask);
        setBoardData(prev => {
            if (!prev || movedTask.projectId !== numericProjectId) return prev;
            // Create a deep copy of columns for manipulation
            let newColumns = JSON.parse(JSON.stringify(prev.columns)) as Column[];

            // Remove task from its old position in any column
            newColumns = newColumns.map(col => ({
                ...col,
                tasksList: col.tasksList.filter(t => t.id !== movedTask.id)
            }));

            const targetColumnIndex = newColumns.findIndex(col => col.id === movedTask.columnId);
            if (targetColumnIndex !== -1) {
                // Add task to the new column and sort
                newColumns[targetColumnIndex].tasksList.push(movedTask);
                newColumns[targetColumnIndex].tasksList.sort((a, b) => a.position - b.position);
            } else {
                console.warn(`Target column ${movedTask.columnId} not found for moved task ${movedTask.id}`);
            }
            return { ...prev, columns: newColumns };
        });
      };

      const handleTaskUpdated = (updatedTask: TaskDto) => { // Use imported TaskDto
        console.log('task:updated event received', updatedTask);
        setBoardData(prev => {
            if (!prev || updatedTask.projectId !== numericProjectId) return prev;
            const newColumns = prev.columns.map(col => {
                if (col.id === updatedTask.columnId) { // Check if task is in this column
                    const taskIndex = col.tasksList.findIndex(t => t.id === updatedTask.id);
                    if (taskIndex !== -1) { // Task found, update it
                        const updatedTasksList = [...col.tasksList];
                        updatedTasksList[taskIndex] = updatedTask;
                        // Ensure list remains sorted if position could change via update
                        updatedTasksList.sort((a,b) => a.position - b.position);
                        return { ...col, tasksList: updatedTasksList };
                    }
                }
                // If task moved columns, this simple update won't be enough, rely on task:moved or ensure backend sends full task details for task:updated
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

  const openAddTaskModal = (columnId: string) => {
    setSelectedColumnId(columnId);
    setIsAddTaskModalOpen(true);
  };
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedColumnId || numericProjectId === null) return;
    setIsCreatingTask(true);
    try {
      const taskData: CreateTaskDto = { title: newTaskTitle, description: newTaskDescription, columnId: selectedColumnId, projectId: numericProjectId };
      await taskService.createTask(taskData);
      setNewTaskTitle(''); setNewTaskDescription(''); setIsAddTaskModalOpen(false); setSelectedColumnId(null);
    } catch (err) { console.error('Failed to create task:', err); alert('Failed to create task.');
    } finally { setIsCreatingTask(false); }
  };

  const handleTaskClick = (task: TaskDto) => { // Handler for task click
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
    const overId = over.id as string; // This can be a column ID or a task ID

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

      // Remove from source
      const [movedTask] = columnsCopy[sourceColIndex].tasksList.splice(sourceTaskIndex, 1);

      let destTaskIndex = columnsCopy[destColIndex].tasksList.findIndex(t => t.id === overId);

      // If overId is a column ID, not a task ID, or task not found, add to end
      if (destTaskIndex === -1) {
          const isOverAColumn = prev.columns.some(col => col.id === overId);
          if(isOverAColumn){ // Dropping on a column
            destTaskIndex = columnsCopy[destColIndex].tasksList.length;
          } else { // Dropping on a task in the destination column
            // This case should ideally be handled by destTaskIndex finding the task
            // If it still is -1, it means overId (task) was not found in overColumn, which is an issue.
            // For safety, add to end, but this indicates a potential logic flaw or stale data.
            console.warn(`Task ${overId} not found in column ${overColumn.id} during dragOver. Adding to end.`);
            destTaskIndex = columnsCopy[destColIndex].tasksList.length;
          }
      }

      // Add to destination
      columnsCopy[destColIndex].tasksList.splice(destTaskIndex, 0, movedTask);

      // Update positions locally for immediate feedback (optional, backend is source of truth)
      // columnsCopy[destColIndex].tasksList = columnsCopy[destColIndex].tasksList.map((task, index) => ({ ...task, position: index }));
      // if (sourceColIndex !== destColIndex) {
      //   columnsCopy[sourceColIndex].tasksList = columnsCopy[sourceColIndex].tasksList.map((task, index) => ({ ...task, position: index }));
      // }

      return { ...prev, columns: columnsCopy };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (!over || !boardData ) {
        // If dropped outside a valid droppable, revert to original state before drag started
        // This requires storing original state onDragStart or re-fetching.
        // For now, if optimistic updates were applied in handleDragOver, they might persist visually until next fetch or socket event.
        // A proper revert might be: setBoardData(originalBoardDataFromDragStart);
        console.log("Drag ended outside a valid droppable or boardData is null. Consider reverting if needed.");
        return;
    }

    const activeId = active.id as string; // ID of the task being dragged

    // Determine the target column and new position
    // The state should have been updated by handleDragOver to reflect the visual drop
    const finalParentColumn = boardData.columns.find(col => col.tasksList.some(task => task.id === activeId));
    if (!finalParentColumn) {
        console.error("Could not find parent column for active task after drag.");
        // Potentially revert or refetch
        fetchBoardData();
        return;
    }

    const newColumnId = finalParentColumn.id;
    const newPosition = finalParentColumn.tasksList.findIndex(task => task.id === activeId);

    if (newPosition === -1) {
        console.error("Could not determine new position for active task after drag.");
        fetchBoardData(); // Revert by refetching
        return;
    }

    // Get the original task details to check if a move actually occurred
    // const originalTask = JSON.parse(JSON.stringify(active.data.current?.sortable?.items?.find((t: TaskDto) => t.id === activeId) ?? // Use imported TaskDto
    //     boardData.columns.flatMap(c => c.tasksList).find(t => t.id === activeId)
    // )); // Attempt to get original from dnd-kit, fallback to searching current state (less reliable for original)

    // This part tries to get the original state of the task before any optimistic updates.
    // However, dnd-kit's active.data.current might not always hold the initial state if not set up explicitly.
    // A more robust way is to store the initial state of boardData onDragStart.
    // For simplicity here, we will rely on the current state and compare with the backend after the API call.
    // The crucial part is sending the correct newColumnId and newPosition to the backend.

    // const taskBeforeDrag = active.data.current?.sortable?.items.find((t: TaskDto) => t.id === activeId) as TaskDto | undefined; // Use imported TaskDto
    // const oldColumnId = taskBeforeDrag?.columnId || findColumnContainingTask(activeId)?.id; // Fallback if not in active.data
    // const oldPosition = taskBeforeDrag?.position;


    // if (newColumnId === oldColumnId && newPosition === oldPosition) {
    //   console.log("Task position and column unchanged.");
    // If optimistic updates in handleDragOver were not perfect, might need to call fetchBoardData() to ensure UI consistency.
      // However, if handleDragOver correctly reflects the visual end state, and no actual change in data occurred, this is fine.
    //  return;
    // }

    try {
      await taskService.moveTask(activeId, { newColumnId, newPosition });
      // Backend will emit 'task:moved', which should handle the final state update.
      // To prevent visual glitches, ensure the local state (after optimistic updates) is consistent
      // or allow the socket event to be the single source of truth post-operation.
      // For now, we assume the socket event will correct any discrepancies.
    } catch (err) {
      console.error('Failed to move task:', err);
      alert('Failed to move task. Reverting optimistic updates by re-fetching.');
      // Revert optimistic updates by fetching the source of truth
      fetchBoardData();
    }
  };

  if (isLoading && !boardData) return <p>Loading board...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!boardData) return <p>No board data found or project ID is invalid.</p>;

  return (
    <> {/* Using React Fragment to wrap DndContext and Modal */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div> {/* Main container for BoardPage content */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px' }}>
            <h1>{boardData.name} ({boardData.prefix})</h1>
            <button
              onClick={() => setIsMembersModalOpen(true)}
              style={{ padding: '8px 15px', cursor: 'pointer' }}
            >
              Manage Members
            </button>
          </div>
          {selectedColumnId && ( // Keep selectedColumnId check if it ensures boardData.columns.find is safe
            <Modal
              isOpen={isAddTaskModalOpen}
              onClose={() => {
                setIsAddTaskModalOpen(false);
                // Optionally reset form fields here if not done elsewhere
                // setNewTaskTitle('');
                // setNewTaskDescription('');
                // setSelectedColumnId(null); // This might be needed if modal can open before selectedColumnId is ready
              }}
              title={`Add New Task to ${boardData?.columns.find(c => c.id === selectedColumnId)?.name || 'Column'}`}
            >
              <form onSubmit={handleCreateTask}>
                {/* The h2 title is removed as it's now a prop of Modal */}
                <div>
                  <label htmlFor="taskTitle">Task Title:</label>
                  <input
                    id="taskTitle"
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginBottom: '10px' }}
                  />
                </div>
                <div>
                  <label htmlFor="taskDescription">Description (Optional):</label>
                  <textarea
                    id="taskDescription"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginBottom: '10px', minHeight: '80px' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddTaskModalOpen(false)}
                    style={{ padding: '8px 15px' }}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={isCreatingTask} style={{ padding: '8px 15px' }}>
                    {isCreatingTask ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </form>
            </Modal>
          )}
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '10px', minHeight: 'calc(100vh - 100px)' }}>
            {boardData.columns.map((column) => (
              <ColumnLane key={column.id} column={column} onAddTask={openAddTaskModal} onTaskClick={handleTaskClick} />
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
    <DragOverlay>{activeDragId ? <div style={{ border: '1px solid gray', padding: '10px', backgroundColor: 'lightyellow' }}>Dragging: {activeDragId}</div> : null}</DragOverlay>
    </>
  );
};
export default BoardPage;
