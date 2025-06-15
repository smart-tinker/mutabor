
import { Link } from 'react-router-dom';
import { useProjectData } from '@/hooks/useProjectData';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

const Index = () => {
  const { projects, addProject, addDefaultProject } = useProjectData();

  const handleAddProject = () => {
    const mutaborProjectExists = projects.some(p => p.name === 'Разработка Mutabor');
    if (!mutaborProjectExists) {
        addDefaultProject();
    } else {
        const newProjectName = `Новый проект ${projects.length + 1}`;
        addProject(newProjectName);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <Header />
      <main>
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold tracking-tighter">Ваши проекты</h2>
            <Button onClick={handleAddProject}>
                <Plus className="mr-2 h-4 w-4"/> Создать проект
            </Button>
        </div>

        <div>
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
                <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                    <h3 className="text-xl font-semibold text-foreground mb-2">У вас пока нет проектов</h3>
                    <p className="mb-4">Начните с создания своего первого проекта.</p>
                    <Button onClick={handleAddProject}>
                        <Plus className="mr-2 h-4 w-4"/> Создать первый проект
                    </Button>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default Index;
