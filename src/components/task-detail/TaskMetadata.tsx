
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from "date-fns";
import { ru } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Column, Category } from '@/types';
import { useFormContext } from "react-hook-form";
import { FormControl, FormField, FormItem } from "@/components/ui/form";

interface TaskMetadataProps {
    columns: Column[] | undefined;
    categories: Category[] | undefined;
}

const priorities = [
    { value: 'Low', label: 'Низкий' },
    { value: 'Medium', label: 'Средний' },
    { value: 'High', label: 'Высокий' },
];

const TaskMetadata = ({
    columns,
    categories,
}: TaskMetadataProps) => {
    const { control, formState: { isSubmitting } } = useFormContext();
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FormField
                control={control}
                name="column_id"
                render={({ field }) => (
                    <FormItem className="space-y-2">
                        <Label>Статус</Label>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите статус..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {columns?.sort((a,b) => a.order - b.order).map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="priority"
                render={({ field }) => (
                    <FormItem className="space-y-2">
                        <Label>Приоритет</Label>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                             <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите приоритет" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {priorities.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="category_id"
                render={({ field }) => (
                    <FormItem className="space-y-2">
                        <Label>Категория</Label>
                        <Select onValueChange={(v) => field.onChange(v === 'none' ? null : v)} value={field.value || 'none'} disabled={isSubmitting}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Без категории" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="none">Без категории</SelectItem>
                                {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="due_date"
                render={({ field }) => (
                    <FormItem className="space-y-2">
                        <Label>Срок выполнения</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                        disabled={isSubmitting}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP", { locale: ru }) : <span>Выберите дату</span>}
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value || undefined}
                                    onSelect={field.onChange}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </FormItem>
                )}
            />
        </div>
    );
};

export default TaskMetadata;
