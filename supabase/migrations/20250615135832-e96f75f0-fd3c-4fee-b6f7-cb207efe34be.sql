
DO $$
DECLARE
    proj RECORD;
    task_rec RECORD;
    next_task_number INT;
BEGIN
    -- Проходим по каждому проекту
    FOR proj IN SELECT id, task_prefix FROM public.projects LOOP
        -- Обрабатываем только те проекты, у которых задан префикс задач
        IF proj.task_prefix IS NOT NULL AND proj.task_prefix <> '' THEN
            -- Находим все задачи в этом проекте, у которых нет ключа, и сортируем их по дате создания
            FOR task_rec IN SELECT id FROM public.tasks WHERE project_id = proj.id AND key IS NULL ORDER BY created_at ASC LOOP
                -- Атомарно увеличиваем счетчик задач в проекте и получаем новое значение
                UPDATE public.projects
                SET task_counter = task_counter + 1
                WHERE id = proj.id
                RETURNING task_counter INTO next_task_number;
                
                -- Генерируем и устанавливаем новый ключ для задачи
                UPDATE public.tasks
                SET key = proj.task_prefix || '-' || next_task_number
                WHERE id = task_rec.id;
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
