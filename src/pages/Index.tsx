
import { useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import Header from '@/components/Header';
import AddTaskForm from '@/components/AddTaskForm';
import TaskList from '@/components/TaskList';
import { Task } from '@/types';

const Index = () => {
  const { tasks, addTask, toggleTask, deleteTask } = useTasks();
  const navigate = useNavigate();

  const handleOpenTaskDetail = (task: Task) => {
    navigate(`/task/${task.id}`);
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
          onOpenChat={handleOpenTaskDetail}
        />
      </main>
    </div>
  );
};

export default Index;
