
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTask, useUpdateTask, useDeleteTask } from '@/hooks/useProject';
import AiChatModal from '@/components/AiChatModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Bot, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const TaskDetailPage = () => {
    const { id: taskId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: task, isLoading, isError } = useTask(taskId!);
    const updateTaskMutation = useUpdateTask(taskId!, task?.project_id);
    const deleteTaskMutation = useDeleteTask(taskId!, task?.project_id);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
        }
    }, [task]);

    const handleSave = () => {
        if (task && title.trim()) {
            if (title !== task.title || description !== (task.description || '')) {
                updateTaskMutation.mutate({ taskId: task.id, updates: { title, description } });
            }
        }
    };

    const handleDelete = () => {
        if (task) {
            deleteTaskMutation.mutate(undefined, {
                onSuccess: () => {
                    navigate(`/project/${task.project_id}`);
                }
            });
        }
    }
    
    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
                <Skeleton className="h-6 w-40" />
                <div className="space-y-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-12 w-full" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
        );
    }
    
    if (isError || !task) {
        return (
            <div className="max-w-2xl mx-auto px-4 text-center py-10">
                <p>Задача не найдена.</p>
                <Button variant="link" asChild>
                    <Link to="/">Вернуться к списку проектов</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4">
            <div className="my-8">
                <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground pl-0">
                    <Link to={task.project_id ? `/project/${task.project_id}` : '/'} className="inline-flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Назад к проекту
                    </Link>
                </Button>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="task-title">Название задачи</Label>
                    <Input 
                        id="task-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-2xl h-12 px-4 font-semibold"
                        onBlur={handleSave}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        disabled={updateTaskMutation.isPending}
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="task-description">Описание</Label>
                    <Textarea 
                        id="task-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Добавьте более подробное описание..."
                        className="min-h-[120px]"
                        onBlur={handleSave}
                        disabled={updateTaskMutation.isPending}
                    />
                </div>

                <div className="flex items-center justify-between gap-4 flex-wrap">
                     <div className="flex items-center gap-2 flex-wrap">
                        <Button onClick={handleSave} disabled={updateTaskMutation.isPending}>
                            {updateTaskMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                        </Button>
                     </div>
                     <div className="flex items-center gap-2">
                        <Button onClick={() => setIsChatOpen(true)} variant="secondary" disabled={deleteTaskMutation.isPending}>
                            <Bot />
                            Обсудить с AI
                        </Button>
                         <Button onClick={handleDelete} variant="destructive" size="icon" disabled={deleteTaskMutation.isPending}>
                             <Trash2 />
                             <span className="sr-only">Удалить</span>
                        </Button>
                     </div>
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
