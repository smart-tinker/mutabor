import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/types';
import { toast } from '@/hooks/use-toast';

// Fetch all projects
const fetchProjects = async (): Promise<Project[]> => {
    const { data, error } = await supabase.from('projects').select('*').order('created_at');
    if (error) throw new Error(error.message);
    return data || [];
};

export const useProjects = () => {
    return useQuery({
        queryKey: ['projects'],
        queryFn: fetchProjects
    });
};

// Add a new project
const addProject = async (name: string): Promise<Project> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Пользователь не аутентифицирован");

    const { data, error } = await supabase.from('projects').insert({ name, user_id: user.id }).select().single();
    if (error) throw new Error(error.message);
    return data;
};

export const useAddProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast({
                title: 'Проект создан!',
                description: 'Новый проект успешно добавлен.',
            });
        },
        onError: (error: Error) => {
            console.error('Error adding project:', error);
            toast({
                title: 'Ошибка при создании проекта',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

// Add default Mutabor project with tasks
const addDefaultProject = async (): Promise<Project> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Пользователь не аутентифицирован");

    const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({ name: 'Разработка Mutabor', user_id: user.id })
        .select()
        .single();
    
    if (projectError) throw new Error(projectError.message);

    const defaultTasks = [
        { title: 'Добавить поля дат в задачи (создание, дедлайн)', description: '' },
        { title: 'Реализовать редактирование названий проектов', description: '' },
        { title: 'Добавить поле приоритета в задачи', description: '' },
        { title: 'Drag & Drop для перемещения задач между колонками', description: '' },
        { title: 'Поиск по задачам и проектам', description: '' },
        { title: 'Цветные метки/теги для задач', description: '' },
        { title: 'Подзадачи и чеклисты', description: '' },
        { title: 'Базовая аналитика (счетчики, прогресс)', description: '' },
        { title: 'Темная тема', description: '' },
        { title: 'Улучшенная AI-интеграция с контекстом всего проекта', description: '' },
        { title: 'Автоматические предложения и анализ', description: '' },
    ];

    const tasksToInsert = defaultTasks.map(task => ({
        ...task,
        project_id: projectData.id,
        column_id: 'todo', // Default column
    }));

    const { error: tasksError } = await supabase.from('tasks').insert(tasksToInsert);
    if (tasksError) {
        // roll back project creation? for now just log error
        console.error("Failed to add default tasks, but project was created.", tasksError);
        // We still return the project, as it was created successfully
    }

    return projectData;
};

export const useAddDefaultProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addDefaultProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast({
                title: 'Проект создан!',
                description: 'Проект "Разработка Mutabor" с задачами успешно добавлен.',
            });
        },
        onError: (error: Error) => {
            console.error('Error adding default project:', error);
            toast({
                title: 'Ошибка при создании проекта',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};
