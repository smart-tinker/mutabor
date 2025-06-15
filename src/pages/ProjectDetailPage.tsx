import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProject, useTasks, useAddTask, useUpdateTask } from '@/hooks/useProject';
import { useColumns } from '@/hooks/useColumns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';

const suggestedTasks = [
    { 
        title: 'Перетаскивание задач (Drag-and-drop)',
        description: 'Реализовать drag-and-drop для перемещения задач между колонками. Это улучшит UX и управление рабочим процессом. Можно использовать react-beautiful-dnd или dnd-kit.'
    },
    { 
        title: 'Назначение исполнителей на задачи',
        description: 'Добавить возможность назначать пользователей на задачи. Потребуется добавить поле assignee_id в таблицу tasks и UI для выбора и отображения исполнителей. Важно для командной работы.'
    },
    {
        title: 'Обновления в реальном времени',
        description: 'Реализовать обновления в реальном времени с помощью подписок Supabase. Когда один пользователь перемещает или редактирует задачу, другие пользователи должны видеть изменения мгновенно, без перезагрузки страницы.'
    },
    {
        title: 'Фильтрация и сортировка задач',
        description: 'Реализовать опции для фильтрации задач по категории, исполнителю или сроку выполнения. Также добавить опции сортировки (например, по дате создания, сроку, названию). Это поможет в управлении большими проектами.'
    },
    {
        title: 'Техдолг: Рефакторинг управления состоянием на странице задачи',
        description: 'Компонент TaskDetailPage использует множество хуков useState для управления полями задачи. Это можно отрефакторить, используя useReducer или библиотеку для управления формами, например react-hook-form, чтобы упростить логику состояния и обновления.'
    }
];

const ProjectDetailPage = () => {
    const { projectKey } = useParams<{ projectKey: string }>();
    const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});
    const { session, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && !session) {
          navigate('/auth');
        }
    }, [session, authLoading, navigate]);

    const { data: project, isLoading: isLoadingProject } = useProject(projectKey!);
    const { data: tasks, isLoading: isLoadingTasks } = useTasks(project?.id!);
    const { data: columns, isLoading: isLoadingColumns } = useColumns();
    const addTaskMutation = useAddTask();
    const updateTaskMutation = useUpdateTask();

    useEffect(() => {
        const flag = `project_${project?.id}_tasks_seeded`;
        if (project && tasks && columns && columns.length > 0 && !localStorage.getItem(flag)) {
            // Part 1: add descriptions to existing tasks
            tasks.forEach(task => {
                if (!task.description) {
                    updateTaskMutation.mutate({
                        taskId: task.id,
                        updates: { description: 'Добавьте описание для этой задачи.' },
                        silent: true
                    });
                }
            });

            // Part 2: add new suggested tasks
            const firstColumn = [...columns].sort((a,b) => a.order - b.order)[0];
            if (firstColumn) {
                suggestedTasks.forEach(task => {
                    addTaskMutation.mutate({
                        projectId: project.id,
                        columnId: firstColumn.id,
                        title: task.title,
                        description: task.description,
                    });
                });
            }

            localStorage.setItem(flag, 'true');
        }
    }, [project, tasks, columns, addTaskMutation, updateTaskMutation]);

    const handleAddTask = (columnId: string) => {
        const title = newTaskTitles[columnId];
        if (title && title.trim() && project?.id) {
            addTaskMutation.mutate({ projectId: project.id, columnId, title }, {
                onSuccess: () => {
                    setNewTaskTitles(prev => ({...prev, [columnId]: ''}));
                }
            });
        }
    };
    
    const handleNewTaskTitleChange = (columnId: string, value: string) => {
        setNewTaskTitles(prev => ({ ...prev, [columnId]: value }));
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                {columns?.map(column => (
                    <div key={column.id} className="bg-muted rounded-lg p-4 h-full flex flex-col">
                        <h2 className="text-lg font-semibold mb-4">{column.title}</h2>
                        <div className="space-y-4 flex-grow">
                            {tasks?.filter(t => t.column_id === column.id).map(task => (
                                <Card key={task.id}>
                                    <CardContent className="p-4">
                                        <Link to={`/project/${project.key}/task/${task.key}`} className="font-medium hover:underline">
                                            {task.key && <span className="text-muted-foreground mr-2 font-mono text-xs">{task.key}</span>}
                                            {task.title}
                                        </Link>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t">
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Новая задача..."
                                    value={newTaskTitles[column.id] || ''}
                                    onChange={(e) => handleNewTaskTitleChange(column.id, e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask(column.id)}
                                    disabled={addTaskMutation.isPending}
                                />
                                <Button onClick={() => handleAddTask(column.id)} size="icon" disabled={addTaskMutation.isPending}>
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ProjectDetailPage;
