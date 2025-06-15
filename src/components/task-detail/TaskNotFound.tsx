
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const TaskNotFound = () => (
    <div className="max-w-2xl mx-auto px-4 text-center py-10">
        <p>Задача не найдена или у вас нет к ней доступа.</p>
        <Button variant="link" asChild>
            <Link to="/">Вернуться к списку проектов</Link>
        </Button>
    </div>
);

export default TaskNotFound;
