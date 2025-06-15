
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProjects, useAddProject, useAddDefaultProject } from '@/hooks/useProjects';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: projects, isLoading: projectsLoading, refetch } = useProjects();
  const addProjectMutation = useAddProject();
  const addDefaultProjectMutation = useAddDefaultProject();

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const isMutationPending = addProjectMutation.isPending || addDefaultProjectMutation.isPending;
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
              <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> Выйти
              </Button>
            </div>
        </div>

        <div>
            {projects && projects.length > 0 ? (
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
                    <Button onClick={handleAddProject} disabled={isMutationPending}>
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
