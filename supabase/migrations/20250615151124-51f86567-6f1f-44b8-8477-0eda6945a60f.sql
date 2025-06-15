
-- Create a new ENUM type for task priorities
CREATE TYPE public.task_priority AS ENUM ('Low', 'Medium', 'High');

-- Add the priority column to the tasks table
-- It will default to 'Medium' for new and existing tasks.
ALTER TABLE public.tasks
ADD COLUMN priority public.task_priority NOT NULL DEFAULT 'Medium';
