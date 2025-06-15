
import { Bot } from 'lucide-react';

const Header = () => {
  return (
    <header className="text-center my-8">
      <div className="inline-flex items-center gap-4">
        <Bot className="w-12 h-12 text-primary" />
        <h1 className="text-5xl font-bold tracking-tighter">Mutabor</h1>
      </div>
      <p className="text-muted-foreground mt-2">Ваш AI-помощник в мире задач</p>
    </header>
  );
};

export default Header;
