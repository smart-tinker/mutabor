
import { useState, useEffect, useRef } from 'react';
import { Project, Task, Column } from '@/types';
import { useColumnData } from './useColumnData';

const PROJECTS_STORAGE_KEY = 'mutabor_projects';

const createDefaultProject = (columns: Column[]): Project => {
    const firstColumnId = columns.length > 0 ? columns[0].id : 'todo';
    
    return {
        id: crypto.randomUUID(),
        name: 'Разработка Mutabor',
        columns: columns,
        tasks: [
            { id: crypto.randomUUID(), title: 'Добавить поля дат в задачи (создание, дедлайн)', columnId: firstColumnId, description: '' },
            { id: crypto.randomUUID(), title: 'Реализовать редактирование названий проектов', columnId: firstColumnId, description: '' },
            { id: crypto.randomUUID(), title: 'Добавить поле приоритета в задачи', columnId: firstColumnId, description: '' },
            { id: crypto.randomUUID(), title: 'Drag & Drop для перемещения задач между колонками', columnId: firstColumnId, description: '' },
            { id: crypto.randomUUID(), title: 'Поиск по задачам и проектам', columnId: firstColumnId, description: '' },
            { id: crypto.randomUUID(), title: 'Цветные метки/теги для задач', columnId: firstColumnId, description: '' },
            { id: crypto.randomUUID(), title: 'Подзадачи и чеклисты', columnId: firstColumnId, description: '' },
            { id: crypto.randomUUID(), title: 'Базовая аналитика (счетчики, прогресс)', columnId: firstColumnId, description: '' },
            { id: crypto.randomUUID(), title: 'Темная тема', columnId: firstColumnId, description: '' },
            { id: crypto.randomUUID(), title: 'Улучшенная AI-интеграция с контекстом всего проекта', columnId: firstColumnId, description: '' },
            { id: crypto.randomUUID(), title: 'Автоматические предложения и анализ', columnId: firstColumnId, description: '' },
        ]
    };
};


export function useProjectData() {
  const { columns: defaultColumns } = useColumnData();
  const [projects, setProjects] = useState<Project[]>([]);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (defaultColumns.length > 0 && !isInitialized.current) {
        let initialProjects: Project[];
        try {
            const storedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
            if (storedProjects) {
                initialProjects = JSON.parse(storedProjects);
            } else {
                initialProjects = [createDefaultProject(defaultColumns)];
            }
        } catch (error) {
            console.error("Error reading projects from localStorage", error);
            initialProjects = [createDefaultProject(defaultColumns)];
        }
        setProjects(initialProjects);
        isInitialized.current = true;
    }
  }, [defaultColumns]);

  useEffect(() => {
    if (isInitialized.current) {
        try {
            localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
        } catch (error) {
            console.error("Error writing projects to localStorage", error);
        }
    }
  }, [projects]);

  const addProject = (name: string) => {
    if (name.trim()) {
      const newProject: Project = {
        id: crypto.randomUUID(),
        name: name.trim(),
        columns: defaultColumns,
        tasks: [],
      };
      setProjects(prevProjects => [...prevProjects, newProject]);
    }
  };
  
  const getProject = (projectId: string) => {
    return projects.find(p => p.id === projectId);
  };

  const addTask = (projectId: string, columnId: string, title: string) => {
     if (!title.trim()) return;
     const newTask: Task = {
        id: crypto.randomUUID(),
        title: title.trim(),
        columnId: columnId,
        description: '',
     };
     setProjects(prevProjects => prevProjects.map(p => {
        if (p.id === projectId) {
            return { ...p, tasks: [...p.tasks, newTask] };
        }
        return p;
     }));
  };
  
  const getTask = (taskId: string) => {
    for (const project of projects) {
        const task = project.tasks.find(t => t.id === taskId);
        if (task) {
            return { task, projectId: project.id };
        }
    }
    return { task: undefined, projectId: undefined };
  };

  const updateTask = (projectId: string, taskId: string, updates: Partial<Omit<Task, 'id' | 'columnId'>>) => {
    setProjects(prevProjects => prevProjects.map(p => {
        if (p.id === projectId) {
            return {
                ...p,
                tasks: p.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
            };
        }
        return p;
    }));
  };

  const deleteTask = (projectId: string, taskId: string) => {
    setProjects(prevProjects => prevProjects.map(p => {
        if (p.id === projectId) {
            return { ...p, tasks: p.tasks.filter(t => t.id !== taskId) };
        }
        return p;
    }));
  };

  return { projects, addProject, getProject, addTask, getTask, updateTask, deleteTask, setProjects };
}
