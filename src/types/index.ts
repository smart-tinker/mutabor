
export interface Column {
  id: string;
  title: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  project_id: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
}

export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}
