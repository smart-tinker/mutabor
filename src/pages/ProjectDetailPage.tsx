import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useProject, useTasks, useUpdateTask } from '@/hooks/useProject';
import { useColumns } from '@/hooks/useColumns';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import TaskColumn from '@/components/TaskColumn';
import { Task } from '@/types';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from '@/hooks/use-toast';

const ProjectDetailPage = () => {
    const { projectKey } = useParams<{ projectKey: string }>();
    const { session, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: project, isLoading: isLoadingProject } = useProject(projectKey!);
    const { data: tasks, isLoading: isLoadingTasks } = useTasks(project?.id!);
    const { data: columns, isLoading: isLoadingColumns } = useColumns();
    const updateTaskMutation = useUpdateTask();
    
    const [optimisticTasks, setOptimisticTasks] = useState<Task[] | undefined>(undefined);

    useEffect(() => {
        if (!authLoading && !session) {
          navigate('/auth');
        }
    }, [session, authLoading, navigate]);

    useEffect(() => {
        if (tasks) {
          // Assign index as order for DnD if not present
          setOptimisticTasks(tasks.map((task, index) => ({ ...task, order: task.order ?? index })));
        }
    }, [tasks]);

    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        },
    }));

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

        // Step 1: Create the new state optimistically
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
        
        affectedColumns.forEach(columnId => {
            if (!columnId) return;
            let orderCounter = 0;
            newTasks.forEach((task, index) => {
                if (task.column_id === columnId) {
                    const originalTaskState = originalTasks.find(t => t.id === task.id);
                    const newOrder = orderCounter++;
                    
                    if (originalTaskState?.order !== newOrder || originalTaskState?.column_id !== task.column_id) {
                        updatesToPersist.push({
                            taskId: task.id,
                            updates: { order: newOrder, column_id: task.column_id }
                        });
                    }
                    newTasks[index] = { ...task, order: newOrder };
                }
            });
        });

        // Set the optimistic state
        setOptimisticTasks(newTasks);

        // Step 2: Persist changes to the server
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
                    // Revert on failure
                    setOptimisticTasks(originalTasks);
                })
                .finally(() => {
                    // Always invalidate to ensure consistency with the server
                     if (project?.id) {
                        queryClient.invalidateQueries({ queryKey: ['tasks', project.id] });
                    }
                });
        }
    };
    
    const isLoading = isLoadingProject || !project || isLoadingTasks || isLoadingColumns;

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-10 w-1/2" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-muted rounded-lg p-4 h-full flex flex-col space-y-4">
                           <Skeleton className="h-6 w-1/3" />
                           <Skeleton className="h-20 w-full" />
                           <Skeleton className="h-20 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="max-w-4xl mx-auto px-4 text-center py-10">
                <p>Проект не найден или у вас нет к нему доступа.</p>
                <Button variant="link" asChild>
                    <Link to="/">Вернуться к списку проектов</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground pl-0">
                    <Link to="/" className="inline-flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        К проектам
                    </Link>
                </Button>
                <div className="flex items-center justify-between gap-4 mt-2">
                    <h1 className="text-4xl font-bold tracking-tight">{project.name}</h1>
                    <Button variant="outline" size="icon" asChild>
                        <Link to={`/project/${project.key}/settings`}>
                            <Settings className="w-5 h-5" />
                            <span className="sr-only">Настройки проекта</span>
                        </Link>
                    </Button>
                </div>
            </div>

            <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                    {columns?.sort((a,b) => a.order - b.order).map(column => (
                        <TaskColumn 
                            key={column.id} 
                            column={column} 
                            tasks={optimisticTasks?.filter(t => t.column_id === column.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) || []}
                            projectKey={project.key!}
                            projectId={project.id}
                        />
                    ))}
                </div>
            </DndContext>
        </div>
    );
}

export default ProjectDetailPage;
