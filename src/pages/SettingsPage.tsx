
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useColumns, useAddColumn, useDeleteColumn } from '@/hooks/useColumns';
import { Skeleton } from '@/components/ui/skeleton';

const API_KEY_STORAGE_KEY = 'mutabor_google_api_key';

const SettingsPage = () => {
  const [apiKey, setApiKey] = useState('');
  const { data: columns, isLoading: isLoadingColumns } = useColumns();
  const addColumnMutation = useAddColumn();
  const deleteColumnMutation = useDeleteColumn();
  const [newColumnName, setNewColumnName] = useState('');

  useEffect(() => {
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
      toast({ title: "API ключ сохранен!" });
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      toast({ title: "API ключ удален." });
    }
  };

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
        addColumnMutation.mutate(newColumnName, {
            onSuccess: () => setNewColumnName('')
        });
    }
  };

  const handleDeleteColumn = (id: string) => {
    if (columns && columns.length <= 1) {
        toast({
            title: "Нельзя удалить последний статус",
            description: "В проекте должен быть хотя бы один статус.",
            variant: "destructive",
        });
        return;
    }
    deleteColumnMutation.mutate(id);
  };


  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground pl-0">
                <Link to="/" className="inline-flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    На главную
                </Link>
            </Button>
        </div>
      <h1 className="text-4xl font-bold tracking-tighter mb-8">Настройки</h1>
      <div className="space-y-8">
        <div className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">API Ключ</h2>
            <div className="space-y-2">
                <Label htmlFor="api-key">Google Gemini API Key</Label>
                <p className="text-sm text-muted-foreground">
                    Ваш ключ хранится локально в браузере и никуда не отправляется.
                </p>
                <Input 
                  id="api-key"
                  type="password"
                  placeholder="Введите ваш Google API ключ"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="bg-secondary"
                />
            </div>
            <Button onClick={handleSave}>Сохранить ключ</Button>
        </div>

        <div className="space-y-4 pt-8 border-t">
            <h2 className="text-2xl font-semibold tracking-tight">Статусы задач</h2>
            <div className="space-y-2">
                <Label>Текущие статусы</Label>
                <p className="text-sm text-muted-foreground">
                    Эти статусы будут использоваться по умолчанию для новых проектов.
                </p>
                <div className="space-y-2 rounded-lg border p-4">
                    {isLoadingColumns ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : columns?.map((column) => (
                        <div key={column.id} className="flex items-center gap-2">
                            <Input value={column.title} readOnly className="bg-background" />
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteColumn(column.id)}
                                disabled={deleteColumnMutation.isPending || (columns && columns.length <= 1)}
                            >
                                <Trash2 className="w-4 h-4 text-destructive" />
                                <span className="sr-only">Удалить {column.title}</span>
                            </Button>
                        </div>
                    ))}
                     {!isLoadingColumns && columns?.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Нет статусов. Добавьте первый.</p>}
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="new-column">Добавить новый статус</Label>
                <div className="flex gap-2">
                    <Input 
                      id="new-column"
                      placeholder="Название статуса"
                      value={newColumnName}
                      onChange={e => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                      disabled={addColumnMutation.isPending}
                    />
                    <Button onClick={handleAddColumn} disabled={addColumnMutation.isPending}>Добавить</Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
