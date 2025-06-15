
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types';
import { toast } from '@/hooks/use-toast';

// Fetch categories for a project
const fetchCategories = async (projectId: string): Promise<Category[]> => {
    const { data, error } = await supabase.from('categories').select('*').eq('project_id', projectId).order('name');
    if (error) throw new Error(error.message);
    return data || [];
};

export const useCategories = (projectId: string) => {
    return useQuery({
        queryKey: ['categories', projectId],
        queryFn: () => fetchCategories(projectId),
        enabled: !!projectId,
    });
};

// Add a category
type AddCategoryPayload = { projectId: string; name: string };
const addCategory = async ({ projectId, name }: AddCategoryPayload): Promise<Category> => {
    if (!name.trim()) throw new Error("Название категории не может быть пустым.");
    const { data, error } = await supabase
        .from('categories')
        .insert({ project_id: projectId, name: name.trim() })
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
};

export const useAddCategory = (projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories', projectId] });
            toast({ title: "Категория добавлена." });
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
