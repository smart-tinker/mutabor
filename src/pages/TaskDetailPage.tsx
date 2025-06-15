
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTask, useUpdateTask, useDeleteTask } from '@/hooks/useProject';
import { useColumns } from '@/hooks/useColumns';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/hooks/useAuth';
import AiChatModal from '@/components/AiChatModal';
import { Task } from '@/types';
import TaskDetailSkeleton from '@/components/task-detail/TaskDetailSkeleton';
import TaskNotFound from '@/components/task-detail/TaskNotFound';
import TaskHeader from '@/components/task-detail/TaskHeader';
import TaskMetadata from '@/components/task-detail/TaskMetadata';
import TaskDescription from '@/components/task-detail/TaskDescription';
import TaskActions from '@/components/task-detail/TaskActions';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
    title: z.string().min(1, "Название обязательно."),
    description: z.string().nullable(),
    column_id: z.string().optional(),
    category_id: z.string().nullable(),
    due_date: z.date().optional().nullable(),
    priority: z.enum(['Low', 'Medium', 'High']),
});

type TaskFormValues = z.infer<typeof formSchema>;

const TaskDetailPage = () => {
    const { projectKey, taskKey } = useParams<{ projectKey?: string, taskKey?: string }>();
    const navigate = useNavigate();
    const { session, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && !session) {
          navigate('/auth');
        }
    }, [session, authLoading, navigate]);

    const { data: task, isLoading: isLoadingTask, isError } = useTask({ projectKey, taskKey });
    const { data: columns, isLoading: isLoadingColumns } = useColumns();
    const { data: categories, isLoading: isLoadingCategories } = useCategories(task?.project_id || '');
    const updateTaskMutation = useUpdateTask();
    const deleteTaskMutation = useDeleteTask();

    const [isChatOpen, setIsChatOpen] = useState(false);

    const form = useForm<TaskFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            description: '',
            priority: 'Medium',
        }
    });

    useEffect(() => {
        if (task) {
            form.reset({
                title: task.title,
                description: task.description || '',
                column_id: task.column_id,
                category_id: task.category_id,
                due_date: task.due_date ? new Date(task.due_date) : undefined,
                priority: task.priority,
            });
        }
    }, [task, form]);

    const onSubmit = (values: TaskFormValues) => {
        if (!task) return;
        
        const updates: Partial<Omit<Task, 'id' | 'project_id' | 'created_at'>> = {};

        if (values.title.trim() !== task.title) {
            updates.title = values.title.trim();
        }
        if (values.description !== (task.description || '')) {
            updates.description = values.description;
        }
        if (values.column_id && values.column_id !== task.column_id) {
            updates.column_id = values.column_id;
        }
        if (values.category_id !== task.category_id) {
            updates.category_id = values.category_id;
        }
        if (values.priority !== task.priority) {
            updates.priority = values.priority;
        }
        
        const newDueDate = values.due_date ? values.due_date.toISOString() : null;
        if (newDueDate !== task.due_date) {
            updates.due_date = newDueDate;
        }

        if (Object.keys(updates).length > 0) {
            updateTaskMutation.mutate({ taskId: task.id, updates });
        }
    };

    const handleDelete = () => {
        if (task) {
            deleteTaskMutation.mutate({ taskId: task.id, projectId: task.project_id }, {
                onSuccess: () => {
                    navigate(`/project/${projectKey}`);
                }
            });
        }
    }
    
    const isLoading = authLoading || isLoadingTask || isLoadingColumns || isLoadingCategories;
    
    if (isLoading) {
        return <TaskDetailSkeleton />;
    }
    
    if (isError || !task) {
        return <TaskNotFound />;
    }

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl mx-auto px-4">
                <div className="space-y-6">
                    <TaskHeader 
                        task={task}
                        projectKey={projectKey}
                    />
                    
                    <TaskMetadata
                        columns={columns}
                        categories={categories}
                    />

                    <TaskDescription />

                    <div className="py-4">
                        <TaskActions
                            handleDelete={handleDelete}
                            onOpenChat={() => setIsChatOpen(true)}
                            isUpdatePending={updateTaskMutation.isPending}
                            isDeletePending={deleteTaskMutation.isPending}
                        />
                    </div>
                </div>

                <AiChatModal
                    task={task}
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                />
            </form>
        </FormProvider>
    )
};

export default TaskDetailPage;
