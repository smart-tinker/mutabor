
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem } from '@/components/ui/form';

const TaskDescription = () => {
    const { control, formState: { isSubmitting } } = useFormContext();
    return (
        <FormField
            control={control}
            name="description"
            render={({ field }) => (
                <FormItem className="space-y-2">
                    <Label htmlFor="task-description">Описание</Label>
                    <FormControl>
                        <Textarea 
                            id="task-description"
                            placeholder="Добавьте более подробное описание..."
                            className="min-h-[120px]"
                            disabled={isSubmitting}
                            {...field}
                            value={field.value || ''}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
    );
};

export default TaskDescription;
