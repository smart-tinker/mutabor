
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateTask } from '@/hooks/useProject';
import { Task } from '@/types';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from '@/hooks/use-toast';

export const useTaskDnd = (initialTasks: Task[] | undefined, projectId: string | undefined) => {
    const queryClient = useQueryClient();
    const updateTaskMutation = useUpdateTask();
    
    const [optimisticTasks, setOptimisticTasks] = useState<Task[] | undefined>(undefined);

    useEffect(() => {
        if (initialTasks) {
          setOptimisticTasks(initialTasks.map((task, index) => ({ ...task, order: task.order ?? index })));
        }
    }, [initialTasks]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }
        
        setOptimisticTasks((currentTasks) => {
            if (!currentTasks) return currentTasks;

            const oldTasks = [...currentTasks];
            const activeIndex = oldTasks.findIndex(t => t.id === active.id);
            const activeTask = oldTasks[activeIndex];

            const overIsColumn = over.data.current?.type === 'Column';
            const overIsTask = over.data.current?.type === 'Task';

            let newTasks = [...oldTasks];
            let newColumnId: string;
            
            // Reorder tasks
            if (overIsTask) {
                const overIndex = oldTasks.findIndex(t => t.id === over.id);
                const overTask = oldTasks[overIndex];
                newColumnId = overTask.column_id;
                
                if (activeTask.column_id === newColumnId) {
                    // Move within same column
                    newTasks = arrayMove(oldTasks, activeIndex, overIndex);
                } else {
                    // Move to different column
                    newTasks[activeIndex] = { ...activeTask, column_id: newColumnId };
                    newTasks = arrayMove(newTasks, activeIndex, overIndex);
                }

            } else if (overIsColumn) {
                newColumnId = over.id as string;
                if (activeTask.column_id !== newColumnId) {
                     // Move to different column (at the end)
                    const taskToMove = { ...activeTask, column_id: newColumnId };
                    newTasks.splice(activeIndex, 1);
                    
                    // Find where to insert it
                    let lastIndexInNewColumn = -1;
                    for (let i = newTasks.length - 1; i >= 0; i--) {
                        if (newTasks[i].column_id === newColumnId) {
                            lastIndexInNewColumn = i;
                            break;
                        }
                    }
                    newTasks.splice(lastIndexInNewColumn + 1, 0, taskToMove);
                }
            } else {
                return oldTasks; // No valid drop target
            }

            // Recalculate order and prepare updates
            const updatesToPersist: {taskId: string, updates: Partial<Task>}[] = [];
            const affectedColumns = new Set([activeTask.column_id, (over.data.current?.task as Task)?.column_id, over.id as string]);

            let finalTasks = [...newTasks];

            affectedColumns.forEach(columnId => {
                if (!columnId) return;
                let orderCounter = 0;
                finalTasks.forEach((task, index) => {
                    if (task.column_id === columnId) {
                        const newOrder = orderCounter++;
                        if (finalTasks[index].order !== newOrder) {
                            finalTasks[index] = { ...task, order: newOrder };
                            updatesToPersist.push({
                                taskId: task.id,
                                updates: { order: newOrder }
                            });
                        }
                    }
                });
            });

             // The column might have changed as well
            const finalActiveTask = finalTasks.find(t => t.id === active.id);
            const originalTask = oldTasks.find(t => t.id === active.id);
            if(finalActiveTask && originalTask && finalActiveTask.column_id !== originalTask.column_id) {
                const existingUpdate = updatesToPersist.find(u => u.taskId === active.id);
                if (existingUpdate) {
                    existingUpdate.updates.column_id = finalActiveTask.column_id;
                } else {
                    updatesToPersist.push({
                        taskId: active.id as string,
                        updates: { column_id: finalActiveTask.column_id }
                    });
                }
            }


            // Persist changes to DB
            if (updatesToPersist.length > 0) {
                 const updatePromises = updatesToPersist.map(update => 
                    updateTaskMutation.mutateAsync({ ...update, silent: true })
                );

                Promise.all(updatePromises)
                    .catch(error => {
                        console.error("Failed to update tasks order:", error);
                        toast({
                            title: "Ошибка при обновлении порядка задач",
                            variant: "destructive"
                        });
                        setOptimisticTasks(oldTasks); // Revert on failure
                    })
                    .finally(() => {
                         if (projectId) {
                            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
                        }
                    });
            }

            return finalTasks;
        });
    };

    return { optimisticTasks, handleDragEnd };
}
