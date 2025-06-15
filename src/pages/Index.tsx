import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProjects, useAddProject, useAddDefaultProject, useDeleteProject } from '@/hooks/useProjects';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { BookText, LogOut, Plus, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Project } from '@/types';

const Index = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: projects, isLoading: projectsLoading, refetch } = useProjects();
  const addProjectMutation = useAddProject();
  const addDefaultProjectMutation = useAddDefaultProject();
  const deleteProjectMutation = useDeleteProject();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/auth');
    }
    if(session) {
        refetch();
    }
  }, [session, authLoading, navigate, refetch]);

  const handleAddProject = () => {
    const mutaborProjectExists = projects?.some(p => p.name === 'Разработка Mutabor');
    if (!mutaborProjectExists) {
        addDefaultProjectMutation.mutate();
    } else {
        const newProjectName = `Новый проект ${projects ? projects.length + 1 : 1}`;
        addProjectMutation.mutate(newProjectName);
    }
  };
  
  const openDeleteDialog = (project: Project) => {
      setProjectToDelete(project);
      setDialogOpen(true);
  };

  const handleDeleteProject = () => {
      if (projectToDelete) {
          deleteProjectMutation.mutate(projectToDelete.id, {
              onSuccess: () => {
                  setDialogOpen(false);
                  setProjectToDelete(null);
              }
          });
      }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const isMutationPending = addProjectMutation.isPending || addDefaultProjectMutation.isPending || deleteProjectMutation.isPending;
  const isLoading = authLoading || (projectsLoading && !projects);

  if (isLoading) {
    return (
        <div className="max-w-4xl mx-auto px-4">
            <Header />
            <div className="flex items-center justify-between mb-8">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-10 w-40" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <Header />
      <main>
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold tracking-tighter">Ваши проекты</h2>
            <div className="flex items-center gap-4">
              <Button onClick={handleAddProject} disabled={isMutationPending}>
                  <Plus className="mr-2 h-4 w-4"/> Создать проект
              </Button>
              <Button variant="outline" asChild>
                <Link to="/docs">
                    <BookText className="mr-2 h-4 w-4" /> Документация
                </Link>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> Выйти
              </Button>
            </div>
        </div>

        <div>
            {projects && projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map(project => (
                        <Card key={project.id} className="flex flex-col hover:shadow-md transition-all">
                            <Link to={`/project/${project.key}`} className="flex-grow">
                                <CardHeader>
                                    <CardTitle>{project.name}</CardTitle>
                                </CardHeader>
                            </Link>
                            <CardFooter className="p-2 border-t mt-auto">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => openDeleteDialog(project)}
                                    disabled={deleteProjectMutation.isPending && projectToDelete?.id === project.id}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Удалить проект
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                    <h3 className="text-xl font-semibold text-foreground mb-2">У вас пока нет проектов</h3>
                    <p className="mb-4">Начните с создания своего первого проекта.</p>
                    <Button onClick={handleAddProject} disabled={isMutationPending}>
                        <Plus className="mr-2 h-4 w-4"/> Создать первый проект
                    </Button>
                </div>
            )}
        </div>
      </main>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Вы уверены, что хотите удалить проект?</AlertDialogTitle>
                <AlertDialogDescription>
                    Это действие невозможно отменить. Это навсегда удалит проект <strong>{projectToDelete?.name}</strong> и все связанные с ним задачи.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Да, удалить
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
