
-- Добавляем колонку 'order' в таблицу 'tasks' для хранения порядка отображения
ALTER TABLE public.tasks
ADD COLUMN "order" integer;
