
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from 'lucide-react';

const API_KEY_STORAGE_KEY = 'mutabor_google_api_key';

const SettingsPage = () => {
  const [apiKey, setApiKey] = useState('');

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

  return (
    <div className="max-w-2xl mx-auto px-4">
        <div className="my-8">
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground pl-0">
                <Link to="/" className="inline-flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Назад к задачам
                </Link>
            </Button>
        </div>
      <h1 className="text-4xl font-bold tracking-tighter mb-4">Настройки</h1>
      <div className="space-y-4">
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
        <Button onClick={handleSave} className="glow-on-hover">Сохранить</Button>
      </div>
    </div>
  );
};

export default SettingsPage;
