import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Project, Task } from '@/types';
import { toast } from '@/hooks/use-toast';

// Fetch single project details
const fetchProject = async (projectId: string): Promise<Project | null> => {
    const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (error) {
      if (error.code === 'PGRST116') return null; // PostgREST code for "Not a single row was found"
      throw new Error(error.message);
    }
    return data;
};

export const useProject = (projectId: string) => {
    return useQuery({
        queryKey: ['project', projectId],
        queryFn: () => fetchProject(projectId),
        enabled: !!projectId,
    });
};

// Fetch tasks for a project
const fetchTasks = async (projectId: string): Promise<Task[]> => {
    const { data, error } = await supabase.from('tasks').select('*').eq('project_id', projectId);
    if (error) throw new Error(error.message);
    return data || [];
};

export const useTasks = (projectId: string) => {
    return useQuery({
        queryKey: ['tasks', projectId],
        queryFn: () => fetchTasks(projectId),
        enabled: !!projectId,
    });
};

// Fetch single task details
const fetchTask = async (taskId: string): Promise<Task | null> => {
    const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
    if (error) {
        throw new Error(error.message);
    }
    return data;
};

export const useTask = (taskId: string) => {
    return useQuery({
        queryKey: ['task', taskId],
        queryFn: () => fetchTask(taskId),
        enabled: !!taskId,
    });
};

// Add a task
type AddTaskPayload = { projectId: string; columnId: string; title: string };
const addTask = async ({ projectId, columnId, title }: AddTaskPayload): Promise<Task> => {
    if (!title.trim()) throw new Error("Title is required");
    const { data, error } = await supabase
        .from('tasks')
        .insert({ project_id: projectId, column_id: columnId, title: title.trim() })
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
};

export const useAddTask = (projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            toast({ title: "Задача добавлена." });
        },
    });
};

// Update a task
type UpdateTaskPayload = { taskId: string; updates: Partial<Omit<Task, 'id' | 'project_id' | 'created_at'>> };
const updateTask = async ({ taskId, updates }: UpdateTaskPayload): Promise<Task> => {
    const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
};

export const useUpdateTask = (taskId: string, projectId?: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTask,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId || data.project_id] });
            queryClient.setQueryData(['task', taskId], data);
            toast({ title: "Задача обновлена." });
        },
    });
};

// Delete a task
const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw new Error(error.message);
};

export const useDeleteTask = (taskId: string, projectId?: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => deleteTask(taskId),
        onSuccess: () => {
            if (projectId) {
                queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            }
            queryClient.removeQueries({ queryKey: ['task', taskId] });
            toast({ title: "Задача удалена.", variant: "destructive" });
        },
    });
};

// Update a project
type UpdateProjectPayload = { projectId: string; updates: Partial<Omit<Project, 'id' | 'created_at' | 'user_id' | 'task_counter'>> };
const updateProject = async ({ projectId, updates }: UpdateProjectPayload): Promise<Project> => {
    const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
};

export const useUpdateProject = (projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateProject,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.setQueryData(['project', projectId], data);
            toast({ title: "Проект обновлен." });
        },
        onError: (error: Error) => {
            toast({
                title: 'Ошибка при обновлении проекта',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};
