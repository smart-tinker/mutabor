
-- Добавляем колонки для префикса и счетчика задач в таблицу проектов
ALTER TABLE public.projects
ADD COLUMN task_prefix TEXT,
ADD COLUMN task_counter INTEGER NOT NULL DEFAULT 0;

-- Добавляем колонку для сгенерированного ключа в таблицу задач
ALTER TABLE public.tasks
ADD COLUMN key TEXT;

-- Добавляем ограничение уникальности для ключа в рамках одного проекта
-- Это позволит иметь одинаковые ключи в разных проектах, но не в одном
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_project_id_key_key UNIQUE (project_id, key);

-- Создаем функцию для генерации ключа задачи.
-- Она будет запускаться автоматически при создании новой задачи.
CREATE OR REPLACE FUNCTION public.generate_task_key()
RETURNS TRIGGER AS $$
DECLARE
  project_prefix TEXT;
  next_task_number INTEGER;
BEGIN
  -- Атомарно увеличиваем счетчик задач и получаем префикс проекта
  UPDATE public.projects
  SET task_counter = task_counter + 1
  WHERE id = NEW.project_id
  RETURNING task_prefix, task_counter INTO project_prefix, next_task_number;

  -- Если префикс задан, генерируем ключ вида "ПРЕФИКС-НОМЕР"
  IF project_prefix IS NOT NULL AND project_prefix <> '' THEN
    NEW.key := project_prefix || '-' || next_task_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем триггер, который вызывает нашу функцию перед вставкой новой задачи
CREATE TRIGGER set_task_key_trigger
BEFORE INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.generate_task_key();
