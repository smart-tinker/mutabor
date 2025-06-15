
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


const TaskDetailPage = () => {
    const { id: taskId, projectId, taskKey } = useParams<{ id?: string, projectId?: string, taskKey?: string }>();
    const navigate = useNavigate();
    const { session, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && !session) {
          navigate('/auth');
        }
    }, [session, authLoading, navigate]);


    const { data: task, isLoading: isLoadingTask, isError } = useTask({ taskId, projectId, taskKey });
    const { data: columns, isLoading: isLoadingColumns } = useColumns();
    const { data: categories, isLoading: isLoadingCategories } = useCategories(task?.project_id || '');
    const updateTaskMutation = useUpdateTask();
    const deleteTaskMutation = useDeleteTask();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [columnId, setColumnId] = useState<string | undefined>();
    const [dueDate, setDueDate] = useState<Date | undefined>();
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setColumnId(task.column_id);
            setDueDate(task.due_date ? new Date(task.due_date) : undefined);
            setCategoryId(task.category_id);
        }
    }, [task]);

    const handleSave = () => {
        if (!task || !title.trim()) return;
        
        const updates: Partial<Omit<Task, 'id' | 'project_id' | 'created_at'>> = {};

        if (title.trim() !== task.title) {
            updates.title = title.trim();
        }
        if (description !== (task.description || '')) {
            updates.description = description;
        }
        if (columnId && columnId !== task.column_id) {
            updates.column_id = columnId;
        }
        if (categoryId !== task.category_id) {
            updates.category_id = categoryId;
        }
        
        const newDueDate = dueDate ? dueDate.toISOString() : null;
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
                    navigate(`/project/${task.project_id}`);
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
        <div className="max-w-2xl mx-auto px-4">
            <div className="space-y-6">
                <TaskHeader 
                    task={task}
                    title={title}
                    setTitle={setTitle}
                    handleSave={handleSave}
                    isPending={updateTaskMutation.isPending}
                />
                
                <TaskMetadata
                    columnId={columnId}
                    setColumnId={setColumnId}
                    categoryId={categoryId}
                    setCategoryId={setCategoryId}
                    dueDate={dueDate}
                    setDueDate={setDueDate}
                    handleSave={handleSave}
                    isPending={updateTaskMutation.isPending}
                    columns={columns}
                    categories={categories}
                />

                <TaskDescription
                    description={description}
                    setDescription={setDescription}
                    handleSave={handleSave}
                    isPending={updateTaskMutation.isPending}
                />

                <div className="py-4">
                    <TaskActions
                        handleSave={handleSave}
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
        </div>
    )
};

export default TaskDetailPage;
