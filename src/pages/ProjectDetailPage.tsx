
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectData } from '@/hooks/useProjectData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

const ProjectDetailPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { getProject, addTask } = useProjectData();
    const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});

    if (!projectId) {
        return <div>Неверный ID проекта</div>;
    }

    const project = getProject(projectId);

    if (!project) {
        return (
            <div className="max-w-4xl mx-auto px-4 text-center py-10">
                <p>Проект не найден.</p>
                <Button variant="link" asChild>
                    <Link to="/">Вернуться к списку проектов</Link>
                </Button>
            </div>
        )
    }

    const handleAddTask = (columnId: string) => {
        const title = newTaskTitles[columnId];
        if (title && title.trim()) {
            addTask(projectId, columnId, title);
            setNewTaskTitles(prev => ({...prev, [columnId]: ''}));
            toast({ title: "Задача добавлена."});
        }
    };
    
    const handleNewTaskTitleChange = (columnId: string, value: string) => {
        setNewTaskTitles(prev => ({ ...prev, [columnId]: value }));
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground pl-0">
                    <Link to="/" className="inline-flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        К проектам
                    </Link>
                </Button>
                <h1 className="text-4xl font-bold tracking-tight mt-2">{project.name}</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {project.columns.map(column => (
                    <div key={column.id} className="bg-muted rounded-lg p-4 h-full flex flex-col">
                        <h2 className="text-lg font-semibold mb-4">{column.title}</h2>
                        <div className="space-y-4 flex-grow">
                            {project.tasks.filter(t => t.columnId === column.id).map(task => (
                                <Card key={task.id}>
                                    <CardContent className="p-4">
                                        <Link to={`/task/${task.id}`} className="font-medium hover:underline">
                                            {task.title}
                                        </Link>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t">
                             <div className="flex gap-2">
                                <Input 
                                    placeholder="Новая задача..."
                                    value={newTaskTitles[column.id] || ''}
                                    onChange={(e) => handleNewTaskTitleChange(column.id, e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask(column.id)}
                                />
                                <Button onClick={() => handleAddTask(column.id)} size="icon">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ProjectDetailPage;
