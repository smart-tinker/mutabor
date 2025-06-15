
import { Task } from '@/types';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id:string) => void;
  onOpenChat: (task: Task) => void;
}

const TaskList = ({ tasks, onToggle, onDelete, onOpenChat }: TaskListProps) => {
    if (tasks.length === 0) {
        return <p className="text-center text-muted-foreground py-16">Список задач пуст. Время добавить первую!</p>
    }
  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          onOpenChat={onOpenChat}
        />
      ))}
    </div>
  );
};

export default TaskList;
