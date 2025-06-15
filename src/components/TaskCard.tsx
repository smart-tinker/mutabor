
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Task } from '@/types';
import { ArrowUp, Minus, ArrowDown, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface TaskCardProps {
    task: Task;
    projectKey: string;
}

const priorityConfig = {
    High: { icon: <ArrowUp className="h-4 w-4 text-red-500" />, label: 'Высокий' },
    Medium: { icon: <Minus className="h-4 w-4 text-yellow-500" />, label: 'Средний' },
    Low: { icon: <ArrowDown className="h-4 w-4 text-green-500" />, label: 'Низкий' },
};

const TaskCard = ({ task, projectKey }: TaskCardProps) => {
    const priority = priorityConfig[task.priority];

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50 ring-2 ring-primary")}>
            <Card>
                <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                        <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground pt-1">
                            <GripVertical className="h-5 w-5" />
                        </div>
                        <div className="flex-grow">
                            <Link to={`/project/${projectKey}/task/${task.key}`} className="font-medium hover:underline">
                                {task.key && <span className="text-muted-foreground mr-2 font-mono text-xs">{task.key}</span>}
                                {task.title}
                            </Link>
                            {task.description && (
                                <p className="text-sm text-muted-foreground mt-1 truncate" title={task.description}>
                                    {task.description}
                                </p>
                            )}
                        </div>
                        {priority && (
                             <div className="flex-shrink-0 pt-1" title={`Приоритет: ${priority.label}`}>
                                <span className="flex items-center">{priority.icon}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default TaskCard;
