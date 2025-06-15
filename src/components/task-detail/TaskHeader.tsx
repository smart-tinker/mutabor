
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import { Task } from '@/types';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

interface TaskHeaderProps {
    task: Task;
    projectKey?: string;
}

const TaskHeader = ({ task, projectKey }: TaskHeaderProps) => {
    const { control, formState: { isSubmitting } } = useFormContext();
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
                <FormField
                    control={control}
                    name="title"
                    render={({ field }) => (
                        <FormItem className="flex-1">
                            <FormLabel htmlFor="task-title" className="sr-only">Название задачи</FormLabel>
                            <FormControl>
                                <Input
                                    id="task-title"
                                    {...field}
                                    className="text-2xl h-12 px-4 font-semibold border-transparent focus:border-input"
                                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                    disabled={isSubmitting}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>
        </>
    );
};

export default TaskHeader;
