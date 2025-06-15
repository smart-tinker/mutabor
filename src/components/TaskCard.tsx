
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Task } from '@/types';
import { ArrowUp, Minus, ArrowDown } from 'lucide-react';

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

    return (
        <Card>
            <CardContent className="p-4">
                <Link to={`/project/${projectKey}/task/${task.key}`} className="font-medium hover:underline block">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-grow">
                            {task.key && <span className="text-muted-foreground mr-2 font-mono text-xs">{task.key}</span>}
                            <span>{task.title}</span>
                        </div>
                        {priority && (
                             <div className="flex-shrink-0">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="flex items-center">{priority.icon}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Приоритет: {priority.label}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        )}
                    </div>
                </Link>
            </CardContent>
        </Card>
    );
};

export default TaskCard;
