import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTask, useUpdateTask, useDeleteTask } from '@/hooks/useProject';
import { useColumns } from '@/hooks/useColumns';
import { useCategories } from '@/hooks/useCategories';
import AiChatModal from '@/components/AiChatModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Bot, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { format } from "date-fns";
import { ru } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Task } from '@/types';


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
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
                <Skeleton className="h-6 w-40" />
                <div className="space-y-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-12 w-full" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
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
                <p>Задача не найдена или у вас нет к ней доступа.</p>
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
                <div className="flex items-center space-x-4">
                    {task.key && <span className="text-2xl font-semibold text-muted-foreground">{task.key}</span>}
                    <div className="flex-1 space-y-2">
                        <Label htmlFor="task-title" className="sr-only">Название задачи</Label>
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
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label>Статус</Label>
                        <Select value={columnId} onValueChange={setColumnId} onOpenChange={(open) => !open && handleSave()}>
                            <SelectTrigger disabled={updateTaskMutation.isPending}>
                                <SelectValue placeholder="Выберите статус..." />
                            </SelectTrigger>
                            <SelectContent>
                                {columns?.sort((a,b) => a.order - b.order).map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Категория</Label>
                        <Select value={categoryId || 'none'} onValueChange={(v) => setCategoryId(v === 'none' ? null : v)} onOpenChange={(open) => !open && handleSave()}>
                            <SelectTrigger disabled={updateTaskMutation.isPending}>
                                <SelectValue placeholder="Без категории" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Без категории</SelectItem>
                                {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Срок выполнения</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !dueDate && "text-muted-foreground"
                                )}
                                disabled={updateTaskMutation.isPending}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dueDate ? format(dueDate, "PPP", { locale: ru }) : <span>Выберите дату</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                mode="single"
                                selected={dueDate}
                                onSelect={(date) => {
                                    setDueDate(date as Date);
                                    handleSave();
                                }}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
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
