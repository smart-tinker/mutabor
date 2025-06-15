
import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';

interface AddTaskFormProps {
  onAddTask: (title: string) => void;
}

const AddTaskForm = ({ onAddTask }: AddTaskFormProps) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTask(title);
    setTitle('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Что нужно сделать?"
        className="flex-grow bg-secondary"
      />
      <Button type="submit" className="glow-on-hover">
        <Plus className="w-4 h-4 mr-2" />
        Добавить
      </Button>
    </form>
  );
};

export default AddTaskForm;
