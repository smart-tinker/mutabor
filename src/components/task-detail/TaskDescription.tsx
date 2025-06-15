
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TaskDescriptionProps {
    description: string;
    setDescription: (description: string) => void;
    handleSave: () => void;
    isPending: boolean;
}

const TaskDescription = ({ description, setDescription, handleSave, isPending }: TaskDescriptionProps) => {
    return (
        <div className="space-y-2">
            <Label htmlFor="task-description">Описание</Label>
            <Textarea 
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Добавьте более подробное описание..."
                className="min-h-[120px]"
                onBlur={handleSave}
                disabled={isPending}
            />
        </div>
    );
};

export default TaskDescription;
