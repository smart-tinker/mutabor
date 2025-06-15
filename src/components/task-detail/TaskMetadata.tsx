
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

interface TaskMetadataProps {
    columnId: string | undefined;
    setColumnId: (id: string | undefined) => void;
    categoryId: string | null;
    setCategoryId: (id: string | null) => void;
    dueDate: Date | undefined;
    setDueDate: (date: Date | undefined) => void;
    handleSave: () => void;
    isPending: boolean;
    columns: Column[] | undefined;
    categories: Category[] | undefined;
}

const TaskMetadata = ({
    columnId,
    setColumnId,
    categoryId,
    setCategoryId,
    dueDate,
    setDueDate,
    handleSave,
    isPending,
    columns,
    categories,
}: TaskMetadataProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
                <Label>Статус</Label>
                <Select value={columnId} onValueChange={setColumnId} onOpenChange={(open) => !open && handleSave()}>
                    <SelectTrigger disabled={isPending}>
                        <SelectValue placeholder="Выберите статус..." />
                    </SelectTrigger>
                    <SelectContent>
                        {columns?.sort((a,b) => a.order - b.order).map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Категория</Label>
                <Select value={categoryId || 'none'} onValueChange={(v) => setCategoryId(v === 'none' ? null : v)} onOpenChange={(open) => !open && handleSave()}>
                    <SelectTrigger disabled={isPending}>
                        <SelectValue placeholder="Без категории" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Без категории</SelectItem>
                        {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Срок выполнения</Label>
                <Popover onOpenChange={(open) => !open && handleSave()}>
                    <PopoverTrigger asChild>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !dueDate && "text-muted-foreground"
                        )}
                        disabled={isPending}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP", { locale: ru }) : <span>Выберите дату</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
};

export default TaskMetadata;
