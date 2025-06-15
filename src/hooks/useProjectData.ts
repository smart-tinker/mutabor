
import { useState, useEffect } from 'react';
import { Project, Task } from '@/types';

const PROJECTS_STORAGE_KEY = 'mutabor_projects';

const DEFAULT_COLUMNS = [
    { id: 'todo', title: 'К выполнению' },
    { id: 'in-progress', title: 'В процессе' },
    { id: 'done', title: 'Готово' },
];

const createDefaultProject = (): Project => ({
    id: crypto.randomUUID(),
    name: 'Мой первый проект',
    columns: DEFAULT_COLUMNS,
    tasks: [
        { id: crypto.randomUUID(), title: 'Настроить рабочее окружение', columnId: 'todo', description: '' },
        { id: crypto.randomUUID(), title: 'Создать первую задачу', columnId: 'todo', description: '' },
    ],
});


export function useProjectData() {
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const storedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (storedProjects) {
        return JSON.parse(storedProjects);
      }
      const defaultProject = createDefaultProject();
      return [defaultProject];
    } catch (error) {
      console.error("Error reading projects from localStorage", error);
      const defaultProject = createDefaultProject();
      return [defaultProject];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
      console.error("Error writing projects to localStorage", error);
    }
  }, [projects]);

  const addProject = (name: string) => {
    if (name.trim()) {
      const newProject: Project = {
        id: crypto.randomUUID(),
        name: name.trim(),
        columns: DEFAULT_COLUMNS,
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
