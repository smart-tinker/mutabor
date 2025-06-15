
import { Task } from '@/types';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Bot, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenChat: (task: Task) => void;
}

const TaskItem = ({ task, onToggle, onDelete, onOpenChat }: TaskItemProps) => {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary hover:bg-muted transition-colors">
      <Checkbox
        id={`task-${task.id}`}
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id)}
      />
      <label
        htmlFor={`task-${task.id}`}
        className={cn(
          "flex-grow cursor-pointer",
          task.completed && "line-through text-muted-foreground"
        )}
      >
        {task.title}
      </label>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => onOpenChat(task)} className="text-primary hover:text-primary glow-on-hover">
          <Bot className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)} className="text-destructive/80 hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default TaskItem;
