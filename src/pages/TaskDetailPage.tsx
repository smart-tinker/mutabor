
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { Task } from '@/types';
import AiChatModal from '@/components/AiChatModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Bot, Trash2 } from 'lucide-react';
import { toast } from "@/hooks/use-toast";

const TaskDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getTask, updateTask, deleteTask, toggleTask } = useTasks();

    const [task, setTask] = useState<Task | null | undefined>(undefined);
    const [title, setTitle] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        if (id) {
            const foundTask = getTask(id);
            setTask(foundTask);
            if (foundTask) {
                setTitle(foundTask.title);
            }
        }
    }, [id, getTask]);

    useEffect(() => {
        if (task === undefined) return;
        const currentTask = getTask(id!);
        setTask(currentTask);
    }, [useTasks().tasks]);


    const handleSave = () => {
        if (task && title.trim()) {
            updateTask(task.id, title);
            toast({ title: "Задача обновлена." });
        }
    };

    const handleDelete = () => {
        if (task) {
            deleteTask(task.id);
            toast({ title: "Задача удалена.", variant: "destructive" });
            navigate('/');
        }
    }
    
    const handleToggle = () => {
        if (task) {
            toggleTask(task.id);
        }
    }

    if (task === undefined) {
        return (
            <div className="max-w-2xl mx-auto px-4 text-center py-10">
                <p>Задача не найдена.</p>
                <Button variant="link" asChild>
                    <Link to="/">Вернуться к списку</Link>
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
                    <Link to="/" className="inline-flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Назад к задачам
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
                        className="text-2xl h-12 px-4 font-semibold bg-secondary"
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                </div>
                
                <div className="flex items-center justify-between gap-4 flex-wrap">
                     <div className="flex items-center gap-2 flex-wrap">
                        <Button onClick={handleSave} className="glow-on-hover">Сохранить</Button>
                        <Button variant="outline" onClick={handleToggle}>
                            {task.completed ? "Отметить как невыполненную" : "Завершить задачу"}
                        </Button>
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
