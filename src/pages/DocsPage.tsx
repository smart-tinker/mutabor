
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const DocsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <Button variant="ghost" asChild>
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Вернуться к проектам
          </Link>
        </Button>
      </div>
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">Документация по проекту</h1>
        <p className="text-lg text-muted-foreground">Добро пожаловать в документацию вашего проекта! Здесь вы можете описать основные аспекты работы, архитектуру, и любые другие важные детали.</p>

        <div className="space-y-4">
            <h2 className="text-2xl font-semibold border-b pb-2">Раздел 1: Введение</h2>
            <p>Краткое описание проекта, его цели и задачи.</p>
        </div>

        <div className="space-y-4">
            <h2 className="text-2xl font-semibold border-b pb-2">Раздел 2: Архитектура</h2>
            <p>Описание технического стека, структуры приложения, взаимодействия компонентов.</p>
            <ul className="list-disc list-inside space-y-1">
                <li>Фронтенд: React, Vite, Tailwind CSS</li>
                <li>Бэкенд/База данных: Supabase</li>
                <li>Роутинг: React Router</li>
                <li>Управление состоянием: TanStack Query</li>
            </ul>
        </div>

        <div className="space-y-4">
            <h2 className="text-2xl font-semibold border-b pb-2">Раздел 3: Ключи задач</h2>
            <p>
            В проекте реализована система уникальных ключей для задач. Каждая задача получает ключ формата <code>ПРЕФИКС-НОМЕР</code>, например, <code>DEV-123</code>.
            Префикс настраивается в настройках каждого проекта. Это помогает легко идентифицировать задачи и ссылаться на них.
            </p>
            <p>
            Задачи доступны по URL вида <code>/project/&lt;id-проекта&gt;/task/&lt;ключ-задачи&gt;</code>.
            </p>
        </div>

        <div className="space-y-4">
            <h2 className="text-2xl font-semibold border-b pb-2">Раздел 4: Дальнейшие шаги</h2>
            <p>Планы по развитию проекта, будущие фичи и улучшения.</p>
        </div>
      </div>
    </div>
  );
};

export default DocsPage;
