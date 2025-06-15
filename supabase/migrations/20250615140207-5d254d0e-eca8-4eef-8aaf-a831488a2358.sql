
-- Добавляем колонку для ключа в таблицу проектов
ALTER TABLE public.projects ADD COLUMN key TEXT;

-- Добавляем ограничение уникальности для ключа
ALTER TABLE public.projects ADD CONSTRAINT projects_key_key UNIQUE (key);

-- Создаем последовательность для нумерации проектов
CREATE SEQUENCE public.project_key_seq START 1;

-- Создаем функцию для генерации ключа проекта с форматированием (PR-0001)
CREATE OR REPLACE FUNCTION public.generate_project_key()
RETURNS TRIGGER AS $$
BEGIN
  -- Генерируем ключ вида "PR-0001"
  NEW.key := 'PR-' || to_char(nextval('public.project_key_seq'), 'FM0000');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем триггер, который вызывает нашу функцию перед созданием нового проекта
DROP TRIGGER IF EXISTS set_project_key_trigger ON public.projects;
CREATE TRIGGER set_project_key_trigger
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.generate_project_key();

-- Обновляем существующие проекты, присваивая им ключи
DO $$
DECLARE
    proj RECORD;
BEGIN
    FOR proj IN SELECT id FROM public.projects WHERE key IS NULL ORDER BY created_at ASC LOOP
        UPDATE public.projects
        SET key = 'PR-' || to_char(nextval('public.project_key_seq'), 'FM0000')
        WHERE id = proj.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
