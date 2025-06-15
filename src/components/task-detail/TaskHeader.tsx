
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { Task } from '@/types';

interface TaskHeaderProps {
    task: Task;
    projectKey?: string;
    title: string;
    setTitle: (title: string) => void;
    handleSave: () => void;
    isPending: boolean;
}

const TaskHeader = ({ task, projectKey, title, setTitle, handleSave, isPending }: TaskHeaderProps) => {
    return (
        <>
            <div className="my-8">
                <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground pl-0">
                    <Link to={projectKey ? `/project/${projectKey}` : '/'} className="inline-flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Назад к проекту
                    </Link>
                </Button>
            </div>
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
                        disabled={isPending}
                    />
                </div>
            </div>
        </>
    );
};

export default TaskHeader;
