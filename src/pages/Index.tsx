
import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import Header from '@/components/Header';
import AddTaskForm from '@/components/AddTaskForm';
import TaskList from '@/components/TaskList';
import AiChatModal from '@/components/AiChatModal';
import { Task } from '@/types';

const Index = () => {
  const { tasks, addTask, toggleTask, deleteTask } = useTasks();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleOpenChat = (task: Task) => {
    setSelectedTask(task);
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    setSelectedTask(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <Header />
      <main>
        <AddTaskForm onAddTask={addTask} />
        <TaskList 
          tasks={tasks}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onOpenChat={handleOpenChat}
        />
      </main>
      <AiChatModal
        task={selectedTask}
        isOpen={isChatOpen}
        onClose={handleCloseChat}
      />
    </div>
  );
};

export default Index;
