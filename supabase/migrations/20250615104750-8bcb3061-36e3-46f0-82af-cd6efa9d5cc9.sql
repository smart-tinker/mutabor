
-- Добавляем колонку user_id в таблицу projects для связи с пользователем
ALTER TABLE public.projects
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Включаем Row Level Security (RLS) для таблицы projects.
-- Это нужно, чтобы пользователи видели только свои данные.
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Политика: Разрешает пользователям видеть только свои проекты.
CREATE POLICY "Users can view their own projects"
ON public.projects FOR SELECT
USING (auth.uid() = user_id);

-- Политика: Разрешает пользователям создавать проекты для самих себя.
CREATE POLICY "Users can insert their own projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Политика: Разрешает пользователям обновлять только свои проекты.
CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE
USING (auth.uid() = user_id);

-- Политика: Разрешает пользователям удалять только свои проекты.
CREATE POLICY "Users can delete their own projects"
ON public.projects FOR DELETE
USING (auth.uid() = user_id);


-- Теперь настраиваем безопасность для задач (tasks)

-- Включаем RLS для таблицы tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Политика: Пользователи могут видеть задачи только из своих проектов.
CREATE POLICY "Users can view tasks in their own projects"
ON public.tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.projects
    WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid()
  )
);

-- Политика: Пользователи могут добавлять задачи только в свои проекты.
CREATE POLICY "Users can insert tasks into their own projects"
ON public.tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projects
    WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid()
  )
);

-- Политика: Пользователи могут обновлять задачи только в своих проектах.
CREATE POLICY "Users can update tasks in their own projects"
ON public.tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.projects
    WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid()
  )
);

-- Политика: Пользователи могут удалять задачи только в своих проектах.
CREATE POLICY "Users can delete tasks in their own projects"
ON public.tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.projects
    WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid()
  )
);
