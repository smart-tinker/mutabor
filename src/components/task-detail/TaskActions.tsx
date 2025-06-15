
import { Button } from '@/components/ui/button';
import { Bot, Trash2 } from 'lucide-react';

interface TaskActionsProps {
    handleSave: () => void;
    handleDelete: () => void;
    onOpenChat: () => void;
    isUpdatePending: boolean;
    isDeletePending: boolean;
}

const TaskActions = ({ handleSave, handleDelete, onOpenChat, isUpdatePending, isDeletePending }: TaskActionsProps) => {
    return (
        <div className="flex items-center justify-between gap-4 flex-wrap">
             <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={handleSave} disabled={isUpdatePending}>
                    {isUpdatePending ? 'Сохранение...' : 'Сохранить'}
                </Button>
             </div>
             <div className="flex items-center gap-2">
                <Button onClick={onOpenChat} variant="secondary" disabled={isDeletePending || isUpdatePending}>
                    <Bot />
                    Обсудить с AI
                </Button>
                 <Button onClick={handleDelete} variant="destructive" size="icon" disabled={isDeletePending || isUpdatePending}>
                     <Trash2 />
                     <span className="sr-only">Удалить</span>
                </Button>
             </div>
        </div>
    );
};

export default TaskActions;
