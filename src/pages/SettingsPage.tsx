
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import ApiKeySettings from '@/components/settings/ApiKeySettings';
import ColumnSettings from '@/components/settings/ColumnSettings';

const SettingsPage = () => {
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
        <ApiKeySettings />
        <ColumnSettings />
      </div>
    </div>
  );
};

export default SettingsPage;
