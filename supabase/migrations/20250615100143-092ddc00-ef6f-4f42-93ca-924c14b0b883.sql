
-- Создаём таблицу для хранения проектов
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Создаём таблицу для хранения статусов (колонок)
-- id имеет тип TEXT, чтобы поддерживать как строковые ID по умолчанию ('todo'), так и UUID для новых статусов.
CREATE TABLE public.columns (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Создаём таблицу для хранения задач
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Добавляем статусы по умолчанию, которые используются в приложении
INSERT INTO public.columns (id, title) VALUES
('todo', 'К выполнению'),
('in-progress', 'В процессе'),
('done', 'Готово')
ON CONFLICT (id) DO NOTHING;

