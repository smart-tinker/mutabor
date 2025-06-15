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
    
    // Fetch the highest order value
    const { data: maxOrderColumn, error: maxOrderError } = await supabase
        .from('columns')
        .select('order')
        .order('order', { ascending: false })
        .limit(1)
        .maybeSingle();
    
    if (maxOrderError) {
        throw new Error(maxOrderError.message);
    }

    const newOrder = (maxOrderColumn?.order || 0) + 1;

    const newColumn = {
        id: crypto.randomUUID(),
        title: title.trim(),
        order: newOrder,
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

// Reorder columns
const updateColumnOrder = async (columns: Pick<Column, 'id' | 'order' | 'title'>[]): Promise<Column[]> => {
    const { data, error } = await supabase
        .from('columns')
        .upsert(columns)
        .select();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Не удалось обновить порядок статусов.");
    return data;
};

export const useUpdateColumnOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateColumnOrder,
        onMutate: async (newOrder) => {
            await queryClient.cancelQueries({ queryKey: ['columns'] });
            const previousColumns = queryClient.getQueryData<Column[]>(['columns']);
            
            queryClient.setQueryData<Column[]>(['columns'], (old) => {
                if (!old) return [];
                const updatedColumns = old.map(c => {
                    const newColOrder = newOrder.find(n => n.id === c.id);
                    return newColOrder ? { ...c, order: newColOrder.order } : c;
                });
                return updatedColumns.sort((a,b) => a.order - b.order);
            });

            return { previousColumns };
        },
        onError: (err: Error, newOrder, context) => {
            if (context?.previousColumns) {
                queryClient.setQueryData(['columns'], context.previousColumns);
            }
            toast({
                title: "Ошибка при обновлении порядка",
                description: err.message,
                variant: "destructive",
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['columns'] });
        },
    });
};
