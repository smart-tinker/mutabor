
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProjectData } from '@/hooks/useProjectData';
import { Task } from '@/types';
import AiChatModal from '@/components/AiChatModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Bot, Trash2 } from 'lucide-react';
import { toast } from "@/hooks/use-toast";

const TaskDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getTask, updateTask, deleteTask } = useProjectData();

    const [task, setTask] = useState<Task | null | undefined>(undefined);
    const [projectId, setProjectId] = useState<string | undefined>(undefined);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        if (id) {
            const { task: foundTask, projectId: foundProjectId } = getTask(id);
            setTask(foundTask);
            setProjectId(foundProjectId);
            if (foundTask) {
                setTitle(foundTask.title);
                setDescription(foundTask.description || '');
            }
        }
    }, [id, getTask]);
    
    // This effect is to refresh data if it changes in the background
    useEffect(() => {
        if (!id) return;
        const { task: currentTask } = getTask(id);
        if (JSON.stringify(task) !== JSON.stringify(currentTask)) {
            setTask(currentTask);
            if (currentTask) {
                setTitle(currentTask.title);
                setDescription(currentTask.description || '');
            }
        }
    }, [useProjectData().projects, id, getTask, task]);


    const handleSave = () => {
        if (task && projectId && title.trim()) {
            updateTask(projectId, task.id, { title, description });
            toast({ title: "Задача обновлена." });
        }
    };

    const handleDelete = () => {
        if (task && projectId) {
            deleteTask(projectId, task.id);
            toast({ title: "Задача удалена.", variant: "destructive" });
            navigate(`/project/${projectId}`);
        }
    }
    
    if (task === undefined) {
        return (
            <div className="max-w-2xl mx-auto px-4 text-center py-10">
                <p>Задача не найдена.</p>
                <Button variant="link" asChild>
                    <Link to="/">Вернуться к списку проектов</Link>
                </Button>
            </div>
        )
    }
    
    if (task === null) {
        return <div className="max-w-2xl mx-auto px-4 text-center py-10">Загрузка...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto px-4">
            <div className="my-8">
                <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground pl-0">
                    <Link to={projectId ? `/project/${projectId}` : '/'} className="inline-flex items-center gap-2">
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
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
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
                    />
                </div>

                <div className="flex items-center justify-between gap-4 flex-wrap">
                     <div className="flex items-center gap-2 flex-wrap">
                        <Button onClick={handleSave} className="glow-on-hover">Сохранить</Button>
                     </div>
                     <div className="flex items-center gap-2">
                        <Button onClick={() => setIsChatOpen(true)} variant="secondary">
                            <Bot />
                            Обсудить с AI
                        </Button>
                         <Button onClick={handleDelete} variant="destructive" size="icon">
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
