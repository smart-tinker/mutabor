import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Column } from '@/types';
import { toast } from '@/hooks/use-toast';

// Fetch columns
const fetchColumns = async (): Promise<Column[]> => {
    const { data, error } = await supabase.from('columns').select('*').order('order');
    if (error) throw new Error(error.message);
    return data || [];
};

export const useColumns = () => {
    return useQuery({
        queryKey: ['columns'],
        queryFn: fetchColumns,
    });
};

// Add column
const addColumn = async (title: string): Promise<Column> => {
    if (!title.trim()) throw new Error("Title is required");

    const { data: existing } = await supabase.from('columns').select('id').ilike('title', title.trim()).maybeSingle();
    if (existing) {
        throw new Error("Статус с таким названием уже есть в списке.");
    }
    
    const newColumn = {
        id: crypto.randomUUID(),
        title: title.trim(),
    };

    const { data, error } = await supabase.from('columns').insert(newColumn).select().single();
    if (error) throw new Error(error.message);
    return data;
};

export const useAddColumn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addColumn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['columns'] });
            toast({ title: "Статус добавлен" });
        },
        onError: (error: Error) => {
            toast({
                title: "Ошибка",
                description: error.message,
                variant: "destructive",
            });
        },
    });
};

// Update column
const updateColumn = async ({ id, title }: { id: string; title: string }): Promise<Column> => {
    if (!title.trim()) throw new Error("Название не может быть пустым.");

    // Check if another column with the same title already exists
    const { data: existing } = await supabase
        .from('columns')
        .select('id')
        .ilike('title', title.trim())
        .not('id', 'eq', id)
        .maybeSingle();

    if (existing) {
        throw new Error("Статус с таким названием уже есть в списке.");
    }

    const { data, error } = await supabase
        .from('columns')
        .update({ title: title.trim() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Не удалось обновить статус.");
    return data;
};

export const useUpdateColumn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateColumn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['columns'] });
            toast({ title: "Статус обновлен" });
        },
        onError: (error: Error) => {
            toast({
                title: "Ошибка при обновлении статуса",
                description: error.message,
                variant: "destructive",
            });
        },
    });
};


// Delete column
const deleteColumn = async (id: string) => {
    // We should probably check if tasks are using this column before deleting
    // For now, let's just delete it. We can add a check later if needed.
    const { data: tasks } = await supabase.from('tasks').select('id').eq('column_id', id).limit(1);
    if (tasks && tasks.length > 0) {
        throw new Error("Нельзя удалить статус, так как он используется в задачах.");
    }

    const { error } = await supabase.from('columns').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const useDeleteColumn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteColumn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['columns'] });
            toast({ title: "Статус удален" });
        },
        onError: (error: Error) => {
            toast({
                title: "Ошибка при удалении статуса",
                description: error.message,
                variant: "destructive",
            });
        },
    });
};
