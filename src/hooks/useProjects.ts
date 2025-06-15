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
        { title: 'Добавить поля дат в задачи (создание, дедлайн)', description: 'В карточке задачи должны отображаться дата создания и поле для установки дедлайна. Дедлайн должен быть редактируемым.' },
        { title: 'Реализовать редактирование названий проектов', description: 'Пользователь должен иметь возможность изменять название проекта на главной странице или на странице самого проекта.' },
        { title: 'Добавить поле приоритета в задачи', description: 'В задачах должно появиться поле "Приоритет" с опциями (например, Низкий, Средний, Высокий), чтобы можно было визуально отличать важные задачи.' },
        { title: 'Drag & Drop для перемещения задач между колонками', description: 'Реализовать возможность перетаскивать карточки задач между разными статусами (колонками) на доске проекта.' },
        { title: 'Поиск по задачам и проектам', description: 'Добавить глобальную строку поиска, которая позволит находить проекты на главной странице и задачи внутри проектов.' },
        { title: 'Цветные метки/теги для задач', description: 'Создать функционал для добавления цветных меток (тегов) к задачам для лучшей визуальной классификации.' },
        { title: 'Подзадачи и чеклисты', description: 'Внутри задачи должна быть возможность создавать список подзадач (чеклист) с возможностью отмечать их выполнение.' },
        { title: 'Базовая аналитика (счетчики, прогресс)', description: 'На странице проекта добавить простую аналитику: количество задач в каждом статусе, общий прогресс выполнения.' },
        { title: 'Темная тема', description: 'Добавить переключатель для смены темы оформления интерфейса со светлой на темную.' },
        { title: 'Улучшенная AI-интеграция с контекстом всего проекта', description: 'AI-ассистент должен иметь доступ ко всем задачам проекта, чтобы давать более релевантные ответы и предложения.' },
        { title: 'Автоматические предложения и анализ', description: 'AI должен уметь анализировать задачи и предлагать следующие шаги, определять возможные риски или предлагать создание связанных задач.' },
    ];

    const { data: columns } = await supabase.from('columns').select('id').limit(1).single();
    const defaultColumnId = columns?.id || 'todo';

    const tasksToInsert = defaultTasks.map(task => ({
        ...task,
        project_id: projectData.id,
        column_id: defaultColumnId,
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
