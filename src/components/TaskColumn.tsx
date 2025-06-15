
import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Task } from '@/types';
import TaskCard from './TaskCard';
import { useAddTask } from '@/hooks/useProject';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskColumnProps {
    column: Column;
    tasks: Task[];
    projectKey: string;
    projectId: string;
}

const TaskColumn = ({ column, tasks, projectKey, projectId }: TaskColumnProps) => {
    const { setNodeRef, isOver } = useDroppable({ 
        id: column.id,
        data: {
            type: 'Column',
            column
        }
    });
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const addTaskMutation = useAddTask();

    const handleAddTask = () => {
        if (newTaskTitle.trim() && projectId) {
            addTaskMutation.mutate({ projectId, columnId: column.id, title: newTaskTitle }, {
                onSuccess: () => {
                    setNewTaskTitle('');
                }
            });
        }
    };
    
    return (
        <div 
            ref={setNodeRef} 
            className={cn(
                "bg-muted rounded-lg p-4 h-full flex flex-col transition-colors",
                isOver && "bg-muted-foreground/20"
            )}
        >
            <h2 className="text-lg font-semibold mb-4">{column.title}</h2>
            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4 flex-grow min-h-[100px]">
                    {tasks.map(task => (
                        <TaskCard key={task.id} task={task} projectKey={projectKey} />
                    ))}
                </div>
            </SortableContext>
            <div className="mt-4 pt-4 border-t">
                <div className="flex gap-2">
                    <Input 
                        placeholder="Новая задача..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                        disabled={addTaskMutation.isPending}
                    />
                    <Button onClick={handleAddTask} size="icon" disabled={addTaskMutation.isPending}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default TaskColumn;
