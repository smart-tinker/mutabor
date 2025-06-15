
export interface Column {
  id: string;
  title: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  columnId: string;
}

export interface Project {
  id: string;
  name: string;
  columns: Column[];
  tasks: Task[];
}

export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}
