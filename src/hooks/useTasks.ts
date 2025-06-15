
import { useState, useEffect } from 'react';
import { Task } from '@/types';

const TASKS_STORAGE_KEY = 'mutabor_tasks';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const storedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
      return storedTasks ? JSON.parse(storedTasks) : [];
    } catch (error) {
      console.error("Error reading tasks from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error("Error writing tasks to localStorage", error);
    }
  }, [tasks]);

  const addTask = (title: string) => {
    if (title.trim()) {
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: title.trim(),
        completed: false,
      };
      setTasks(prevTasks => [...prevTasks, newTask]);
    }
  };

  const toggleTask = (id: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
  };

  return { tasks, addTask, toggleTask, deleteTask };
}
