
-- Добавляем колонку 'order' для сортировки статусов
ALTER TABLE public.columns ADD COLUMN "order" INTEGER;

-- Устанавливаем начальный порядок для существующих статусов на основе даты создания
WITH ranked_columns AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.columns
)
UPDATE public.columns
SET "order" = ranked_columns.rn
FROM ranked_columns
WHERE public.columns.id = ranked_columns.id;

-- Делаем колонку 'order' обязательной
ALTER TABLE public.columns ALTER COLUMN "order" SET NOT NULL;

-- Добавляем колонку 'due_date' (срок выполнения) в задачи
ALTER TABLE public.tasks ADD COLUMN due_date TIMESTAMPTZ;

-- Создаем таблицу для категорий задач
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Добавляем колонку 'category_id' в задачи
ALTER TABLE public.tasks ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Включаем защиту на уровне строк для таблицы категорий
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Правила доступа для категорий (аналогично задачам и проектам)
CREATE POLICY "Users can view categories in their own projects"
ON public.categories FOR SELECT
USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = categories.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can insert categories into their own projects"
ON public.categories FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = categories.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can update categories in their own projects"
ON public.categories FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = categories.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can delete categories from their own projects"
ON public.categories FOR DELETE
USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = categories.project_id AND projects.user_id = auth.uid()));
