
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectData } from '@/hooks/useProjectData';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

const Index = () => {
  const { projects, addProject } = useProjectData();
  const [newProjectName, setNewProjectName] = useState('');

  const handleAddProject = () => {
    if (newProjectName.trim()) {
      addProject(newProjectName);
      setNewProjectName('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <Header />
      <main>
        <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Новый проект</h2>
            <div className="flex gap-2">
                <Input 
                    placeholder="Название проекта..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
                />
                <Button onClick={handleAddProject}>
                    <Plus className="mr-2"/> Создать
                </Button>
            </div>
        </div>

        <div>
            <h2 className="text-2xl font-semibold mb-4">Ваши проекты</h2>
            {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map(project => (
                        <Link to={`/project/${project.id}`} key={project.id}>
                            <Card className="hover:shadow-md hover:border-primary transition-all h-full">
                                <CardHeader>
                                    <CardTitle>{project.name}</CardTitle>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-16">У вас пока нет проектов. Время создать первый!</p>
            )}
        </div>
      </main>
    </div>
  );
};

export default Index;
