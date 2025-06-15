
import { useState, useEffect } from 'react';
import { Column } from '@/types';
import { toast } from '@/hooks/use-toast';

const COLUMNS_STORAGE_KEY = 'mutabor_columns';

const DEFAULT_COLUMNS: Column[] = [
    { id: 'todo', title: 'К выполнению' },
    { id: 'in-progress', title: 'В процессе' },
    { id: 'done', title: 'Готово' },
];

export function useColumnData() {
    const [columns, setColumns] = useState<Column[]>(() => {
        try {
            const stored = localStorage.getItem(COLUMNS_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
            return DEFAULT_COLUMNS;
        } catch (error) {
            console.error("Error reading columns from localStorage", error);
            return DEFAULT_COLUMNS;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columns));
        } catch (error) {
            console.error("Error writing columns to localStorage", error);
        }
    }, [columns]);

    const addColumn = (title: string) => {
        if (title.trim()) {
            if (columns.some(c => c.title.toLowerCase() === title.trim().toLowerCase())) {
                toast({
                    title: "Статус уже существует",
                    description: "Статус с таким названием уже есть в списке.",
                    variant: "destructive",
                });
                return;
            }
            const newColumn: Column = {
                id: crypto.randomUUID(),
                title: title.trim(),
            };
            setColumns(prev => [...prev, newColumn]);
            toast({ title: "Статус добавлен" });
        }
    };

    const deleteColumn = (id: string) => {
        if (columns.length <= 1) {
            toast({
                title: "Нельзя удалить последний статус",
                description: "В проекте должен быть хотя бы один статус.",
                variant: "destructive",
            });
            return;
        }
        setColumns(prev => prev.filter(c => c.id !== id));
        toast({ title: "Статус удален" });
    };

    return { columns, addColumn, deleteColumn };
}
