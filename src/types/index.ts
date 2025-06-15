
export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}
