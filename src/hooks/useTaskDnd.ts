
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateTask } from '@/hooks/useProject';
import { Task, Column } from '@/types';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from '@/hooks/use-toast';

export const useTaskDnd = (initialTasks: Task[] | undefined, projectId: string | undefined, columns: Column[] | undefined) => {
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
            if (!currentTasks || !columns) return currentTasks;

            const oldTasks = [...currentTasks];
            const oldIndex = oldTasks.findIndex(t => t.id === active.id);
            const activeTask = oldTasks[oldIndex];

            const overIsColumn = over.data.current?.type === 'Column';
            const overIsTask = over.data.current?.type === 'Task';
            
            let newTasks: Task[];

            if (overIsTask) {
                const overIndex = oldTasks.findIndex(t => t.id === over.id);
                if (overIndex === -1) return oldTasks;
                const overTask = oldTasks[overIndex];

                if (activeTask.column_id === overTask.column_id) {
                    newTasks = arrayMove(oldTasks, oldIndex, overIndex);
                } else {
                    const tempTasks = [...oldTasks];
                    tempTasks[oldIndex] = { ...activeTask, column_id: overTask.column_id };
                    newTasks = arrayMove(tempTasks, oldIndex, overIndex);
                }
            } else if (overIsColumn) {
                const newColumnId = over.id as string;
                if (activeTask.column_id === newColumnId) return oldTasks;
                
                const taskToMove = { ...activeTask, column_id: newColumnId };
                let tempTasks = oldTasks.filter(t => t.id !== active.id);

                const tasksInNewColumn = tempTasks.filter(t => t.column_id === newColumnId);
                
                if (tasksInNewColumn.length > 0) {
                    const lastTask = tasksInNewColumn[tasksInNewColumn.length - 1];
                    const insertionIndex = tempTasks.findIndex(t => t.id === lastTask.id) + 1;
                    tempTasks.splice(insertionIndex, 0, taskToMove);
                } else {
                    const sortedColumns = columns.sort((a,b) => a.order - b.order);
                    const newColumnOrder = sortedColumns.findIndex(c => c.id === newColumnId);
                    
                    let insertionIndex = tempTasks.length;
                    for (let i = newColumnOrder + 1; i < sortedColumns.length; i++) {
                        const nextColumnId = sortedColumns[i].id;
                        const firstTaskInNextColumn = tempTasks.find(t => t.column_id === nextColumnId);
                        if (firstTaskInNextColumn) {
                            insertionIndex = tempTasks.findIndex(t => t.id === firstTaskInNextColumn.id);
                            break;
                        }
                    }
                    tempTasks.splice(insertionIndex, 0, taskToMove);
                }
                newTasks = tempTasks;
            } else {
                return oldTasks;
            }
            
            // Recalculate order and prepare updates
            const updatesToPersist: {taskId: string, updates: Partial<Task>}[] = [];
            const affectedColumns = new Set([activeTask.column_id, (newTasks.find(t => t.id === active.id))?.column_id]);

            affectedColumns.forEach(columnId => {
                if (!columnId) return;
                let orderCounter = 0;
                newTasks.forEach((task, index) => {
                    if (task.column_id === columnId) {
                        const originalTask = oldTasks.find(t => t.id === task.id);
                        const newOrder = orderCounter++;
                        
                        if (newTasks[index].order !== newOrder || newTasks[index].column_id !== originalTask?.column_id) {
                            newTasks[index] = { ...task, order: newOrder };
                            
                            const updatePayload: Partial<Task> = {};
                            if (newTasks[index].order !== originalTask?.order) {
                                updatePayload.order = newOrder;
                            }
                            if (newTasks[index].column_id !== originalTask?.column_id) {
                                updatePayload.column_id = newTasks[index].column_id;
                            }
                            
                            if (Object.keys(updatePayload).length > 0) {
                                const existingUpdate = updatesToPersist.find(u => u.taskId === task.id);
                                if (existingUpdate) {
                                    Object.assign(existingUpdate.updates, updatePayload);
                                } else {
                                    updatesToPersist.push({ taskId: task.id, updates: updatePayload });
                                }
                            }
                        }
                    }
                });
            });

            // Persist changes to DB
            if (updatesToPersist.length > 0) {
                 updatesToPersist.forEach(update => 
                    updateTaskMutation.mutate({ ...update, silent: true }, {
                        onError: () => {
                            toast({
                                title: "Ошибка при обновлении порядка задач",
                                variant: "destructive"
                            });
                            setOptimisticTasks(oldTasks); // Revert on failure
                        },
                        onSettled: () => {
                             if (projectId) {
                                queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
                            }
                        }
                    })
                );
            }

            return newTasks;
        });
    };

    return { optimisticTasks, handleDragEnd };
}
