
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

        if (!over || !optimisticTasks || active.id === over.id) return;

        const originalTasks = [...optimisticTasks];
        
        const activeId = active.id as string;
        const activeIndex = originalTasks.findIndex((t) => t.id === activeId);
        if (activeIndex === -1) return;
        const activeTask = originalTasks[activeIndex];

        const overId = over.id as string;
        const overIsColumn = over.data.current?.type === 'Column';
        const overIsTask = over.data.current?.type === 'Task';
        let newColumnId: string | null = null;

        if (overIsTask) {
            const overIndex = originalTasks.findIndex((t) => t.id === overId);
            if(overIndex === -1) return;
            newColumnId = originalTasks[overIndex].column_id;
        } else if (overIsColumn) {
            newColumnId = overId;
        }

        if (!newColumnId) return;
        
        let newTasks = [...originalTasks];
        const originalColumnId = activeTask.column_id;

        if (originalColumnId !== newColumnId) {
            newTasks[activeIndex] = { ...activeTask, column_id: newColumnId };
        }
        
        const finalActiveIndex = newTasks.findIndex(t => t.id === activeId);

        if (overIsTask) {
            const finalOverIndex = newTasks.findIndex(t => t.id === overId);
            if (finalOverIndex !== -1 && finalActiveIndex !== finalOverIndex) {
              newTasks = arrayMove(newTasks, finalActiveIndex, finalOverIndex);
            }
        } else if (overIsColumn) {
            const taskToMove = newTasks.splice(finalActiveIndex, 1)[0];
            
            let lastIndexOfNewColumn = -1;
            for(let i = newTasks.length - 1; i >= 0; i--) {
                if(newTasks[i].column_id === newColumnId) {
                    lastIndexOfNewColumn = i;
                    break;
                }
            }
            if(lastIndexOfNewColumn !== -1) {
                newTasks.splice(lastIndexOfNewColumn + 1, 0, taskToMove);
            } else {
                 newTasks.push(taskToMove);
            }
        }
        
        const updatesToPersist: {taskId: string, updates: Partial<Task>}[] = [];
        const affectedColumns = new Set([originalColumnId, newColumnId]);
        
        let finalTasks = [...newTasks];

        affectedColumns.forEach(columnId => {
            if (!columnId) return;
            let orderCounter = 0;
            finalTasks = finalTasks.map((task) => {
                if (task.column_id === columnId) {
                    const originalTaskState = originalTasks.find(t => t.id === task.id);
                    const newOrder = orderCounter++;
                    
                    if (originalTaskState?.order !== newOrder || originalTaskState?.column_id !== task.column_id) {
                        updatesToPersist.push({
                            taskId: task.id,
                            updates: { order: newOrder, column_id: task.column_id }
                        });
                    }
                    return { ...task, order: newOrder };
                }
                return task;
            });
        });
        
        setOptimisticTasks(finalTasks);

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
                    setOptimisticTasks(originalTasks);
                })
                .finally(() => {
                     if (projectId) {
                        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
                    }
                });
        }
    };

    return { optimisticTasks, handleDragEnd };
}
