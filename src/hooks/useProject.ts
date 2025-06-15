import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Project, Task } from '@/types';
import { toast } from '@/hooks/use-toast';

// Fetch single project details
const fetchProject = async (projectKey: string): Promise<Project | null> => {
    if (!projectKey) return null;
    const { data, error } = await supabase.from('projects').select('*').eq('key', projectKey).single();
    if (error) {
      if (error.code === 'PGRST116') return null; // PostgREST code for "Not a single row was found"
      throw new Error(error.message);
    }
    return data;
};

export const useProject = (projectKey: string) => {
    return useQuery({
        queryKey: ['project', projectKey],
        queryFn: () => fetchProject(projectKey),
        enabled: !!projectKey,
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
const fetchTask = async ({ projectKey, taskKey }: { projectKey?: string; taskKey?: string }): Promise<Task | null> => {
    if (!projectKey || !taskKey) return null;

    // 1. Fetch project by key to get project ID
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('key', projectKey)
        .maybeSingle();
    
    if (projectError) {
        throw new Error(projectError.message);
    }
    if (!project) {
        return null; // Project not found, so task cannot be found either
    }

    // 2. Fetch task using project ID and task key
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project.id)
        .eq('key', taskKey)
        .maybeSingle();
        
    if (error) {
        throw new Error(error.message);
    }
    return data;
};

export const useTask = ({ projectKey, taskKey }: { projectKey?: string; taskKey?: string }) => {
    return useQuery({
        queryKey: ['task', { projectKey, taskKey }],
        queryFn: () => fetchTask({ projectKey, taskKey }),
        enabled: !!projectKey && !!taskKey,
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

export const useAddTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addTask,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', data.project_id] });
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

export const useUpdateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTask,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', data.project_id] });
            queryClient.invalidateQueries({ queryKey: ['task'] });
            toast({ title: "Задача обновлена." });
        },
    });
};

// Delete a task
type DeleteTaskPayload = { taskId: string; projectId?: string };
const deleteTask = async ({ taskId }: DeleteTaskPayload) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw new Error(error.message);
};

export const useDeleteTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteTask,
        onSuccess: (_data, variables) => {
            if (variables.projectId) {
                queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
            }
            queryClient.invalidateQueries({ queryKey: ['task'] });
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

export const useUpdateProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateProject,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            if (data.key) {
                queryClient.setQueryData(['project', data.key], data);
            }
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
