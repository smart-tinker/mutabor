
export interface Column {
  id: string;
  title: string;
  created_at: string;
  order: number;
}

export interface Task {
  id: string;
  key: string | null;
  title: string;
  description: string | null;
  column_id: string;
  project_id: string;
  created_at: string;
  due_date: string | null;
  category_id: string | null;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
  task_prefix: string | null;
  task_counter: number;
}

export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface Category {
  id: string;
  name: string;
  project_id: string;
  created_at: string;
}
