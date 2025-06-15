
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProject, useUpdateProject } from '@/hooks/useProject';
import { useDeleteProject } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ProjectSettingsPage = () => {
    const { projectKey } = useParams<{ projectKey: string }>();
    const { session, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const { data: project, isLoading: isLoadingProject } = useProject(projectKey!);
    const updateProjectMutation = useUpdateProject();
    const deleteProjectMutation = useDeleteProject();

    const [name, setName] = useState('');
    const [prefix, setPrefix] = useState('');

    useEffect(() => {
        if (!authLoading && !session) {
            navigate('/auth');
        }
    }, [session, authLoading, navigate]);
    
    useEffect(() => {
        if (project) {
            setName(project.name);
            setPrefix(project.task_prefix || '');
        }
    }, [project]);

    const handleSave = () => {
        if (!name.trim()) {
            toast({ title: "Название проекта не может быть пустым.", variant: "destructive" });
            return;
        }
        if (project) {
            updateProjectMutation.mutate({
                projectId: project.id,
                updates: { name: name.trim(), task_prefix: prefix.trim().toUpperCase() || null }
            });
        }
    };

    const handleDeleteProject = () => {
        if (project) {
            deleteProjectMutation.mutate(project.id, {
                onSuccess: () => {
                    navigate('/');
                }
            });
        }
    };

    if (authLoading || isLoadingProject) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8">
                <Skeleton className="h-8 w-48 mb-8" />
                <Skeleton className="h-10 w-64 mb-8" />
                <div className="space-y-8">
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }
    
    if (!project) {
        return (
             <div className="max-w-4xl mx-auto px-4 text-center py-10">
                <p>Проект не найден или у вас нет к нему доступа.</p>
                <Button variant="link" asChild>
                    <Link to="/">Вернуться к списку проектов</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
            <div>
                <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground pl-0">
                    <Link to={`/project/${project.key}`} className="inline-flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        К проекту
                    </Link>
                </Button>
            </div>
            <h1 className="text-4xl font-bold tracking-tighter">Настройки проекта</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Основные настройки</CardTitle>
                    <CardDescription>Измените название проекта и префикс для задач.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="project-name">Название проекта</Label>
                        <Input 
                            id="project-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-secondary"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="task-prefix">Префикс задач (заглавными буквами)</Label>
                        <Input
                            id="task-prefix"
                            placeholder="Например, TSK"
                            value={prefix}
                            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                            className="bg-secondary"
                        />
                         <p className="text-sm text-muted-foreground">
                            Уникальный ключ для задач будет выглядеть как ПРЕФИКС-1, ПРЕФИКС-2, и т.д. Оставьте поле пустым, если префикс не нужен.
                        </p>
                    </div>
                    <Button onClick={handleSave} disabled={updateProjectMutation.isPending}>
                        {updateProjectMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Опасная зона</CardTitle>
                    <CardDescription>Это действие необратимо. Удаление проекта приведет к потере всех связанных с ним данных.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удалить этот проект
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Вы абсолютно уверены?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Это действие не может быть отменено. Это приведет к необратимому удалению проекта "{project?.name}" и всех его задач.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction
                                    disabled={deleteProjectMutation.isPending}
                                    onClick={handleDeleteProject}
                                    className={buttonVariants({ variant: "destructive" })}
                                >
                                    {deleteProjectMutation.isPending ? 'Удаление...' : 'Да, удалить проект'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>

        </div>
    );
};

export default ProjectSettingsPage;
