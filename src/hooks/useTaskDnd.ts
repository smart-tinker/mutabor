
import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateTask } from '@/hooks/useProject';
import { Task, Column } from '@/types';
import { DragEndEvent } from '@dnd-kit/core';
import { toast } from '@/hooks/use-toast';

export const useTaskDnd = (initialTasks: Task[] | undefined, projectId: string | undefined, sortedColumns: Column[] | undefined) => {
    const queryClient = useQueryClient();
    const updateTaskMutation = useUpdateTask();
    
    const [optimisticTasks, setOptimisticTasks] = useState<Task[] | undefined>(undefined);

    useEffect(() => {
        if (initialTasks) {
            const tasksWithOrder = initialTasks.map((task, index) => ({ ...task, order: task.order ?? index }));
            setOptimisticTasks(tasksWithOrder);
        }
    }, [initialTasks]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const activeId = String(active.id);
        const overId = String(over.id);
        
        setOptimisticTasks((currentTasks) => {
            if (!currentTasks || !sortedColumns) {
                return currentTasks;
            }

            const oldTasks = [...currentTasks];
            const activeTask = oldTasks.find(t => t.id === activeId);
            if (!activeTask) return oldTasks;
            
            const activeTaskIndex = oldTasks.findIndex(t => t.id === activeId);

            const overIsColumn = over.data.current?.type === 'Column';
            const overIsTask = over.data.current?.type === 'Task';

            let newColumnId: string;
            let newIndexInAllTasks: number;

            if (overIsTask) {
                const overTask = oldTasks.find(t => t.id === overId);
                if (!overTask) return oldTasks;
                newColumnId = overTask.column_id;
                newIndexInAllTasks = oldTasks.findIndex(t => t.id === overId);
            } else if (overIsColumn) {
                newColumnId = overId;
                const tasksInTargetColumn = oldTasks
                    .filter(t => t.column_id === newColumnId)
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

                if (tasksInTargetColumn.length > 0) {
                    const lastTask = tasksInTargetColumn[tasksInTargetColumn.length - 1];
                    const lastTaskIndex = oldTasks.findIndex(t => t.id === lastTask.id);
                    newIndexInAllTasks = lastTaskIndex + 1;
                } else {
                    const targetColumnOrder = sortedColumns.findIndex(c => c.id === newColumnId);
                    if (targetColumnOrder === -1) return oldTasks;
                    
                    let insertionIndex = oldTasks.length;
                    for (let i = targetColumnOrder + 1; i < sortedColumns.length; i++) {
                        const nextColumn = sortedColumns[i];
                        const firstTaskInNextCol = oldTasks.find(t => t.column_id === nextColumn.id);
                        if (firstTaskInNextCol) {
                            insertionIndex = oldTasks.findIndex(t => t.id === firstTaskInNextCol.id);
                            break;
                        }
                    }
                    newIndexInAllTasks = insertionIndex;
                }
            } else {
                return oldTasks;
            }

            let newTasks = [...oldTasks];
            const [movedTask] = newTasks.splice(activeTaskIndex, 1);
            movedTask.column_id = newColumnId;
            
            const finalIndex = activeTaskIndex < newIndexInAllTasks ? newIndexInAllTasks - 1 : newIndexInAllTasks;
            newTasks.splice(finalIndex, 0, movedTask);

            const updatesToPersist: {taskId: string, updates: Partial<Task>}[] = [];
            
            const affectedColumnIds = new Set([activeTask.column_id, newColumnId]);

            affectedColumnIds.forEach(columnId => {
                if (!columnId) return;
                const tasksInColumn = newTasks.filter(t => t.column_id === columnId);
                tasksInColumn.forEach((task, index) => {
                    const originalTask = oldTasks.find(t => t.id === task.id);
                    const hasChanged = task.order !== index || task.column_id !== originalTask?.column_id;
                    
                    if (hasChanged) {
                        const updatePayload: Partial<Task> = { order: index };
                        if (task.column_id !== originalTask?.column_id) {
                            updatePayload.column_id = task.column_id;
                        }
                        updatesToPersist.push({ taskId: task.id, updates: updatePayload });
                        
                        const taskInNewTasksIndex = newTasks.findIndex(t => t.id === task.id);
                        if(taskInNewTasksIndex !== -1) {
                            newTasks[taskInNewTasksIndex] = { ...task, order: index };
                        }
                    }
                });
            });

            if (updatesToPersist.length > 0) {
                 updatesToPersist.forEach(update => 
                    updateTaskMutation.mutate({ ...update, silent: true }, {
                        onError: () => {
                            toast({
                                title: "Ошибка при обновлении порядка задач",
                                variant: "destructive"
                            });
                            setOptimisticTasks(oldTasks);
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
