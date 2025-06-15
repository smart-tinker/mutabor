
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const AuthPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoginView, setIsLoginView] = useState(true);
    const navigate = useNavigate();
    const { session } = useAuth();

    useEffect(() => {
        if (session) {
            navigate('/');
        }
    }, [session, navigate]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (isLoginView) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                toast({ title: 'Вход выполнен успешно!' });
                navigate('/');
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                    },
                });
                if (error) throw error;
                toast({ title: 'Проверьте почту!', description: 'Мы отправили вам ссылку для подтверждения регистрации.' });
            }
        } catch (error: any) {
            toast({
                title: 'Ошибка',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">{isLoginView ? 'Вход в систему' : 'Регистрация'}</CardTitle>
                    <CardDescription>
                        {isLoginView ? 'Введите свои данные для входа' : 'Создайте новый аккаунт'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Пароль</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? 'Обработка...' : (isLoginView ? 'Войти' : 'Зарегистрироваться')}
                        </Button>
                    </form>
                    <div className="mt-4 text-center text-sm">
                        {isLoginView ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                        <Button variant="link" onClick={() => setIsLoginView(!isLoginView)} className="px-1">
                            {isLoginView ? 'Зарегистрироваться' : 'Войти'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AuthPage;
