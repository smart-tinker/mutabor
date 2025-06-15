
import { Bot, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

const Header = () => {
  return (
    <header className="text-center my-8 relative">
      <div className="inline-flex items-center gap-4">
        <Bot className="w-12 h-12 text-primary" />
        <h1 className="text-5xl font-bold tracking-tighter">Mutabor</h1>
      </div>
      <p className="text-muted-foreground mt-2">Ваш AI-помощник в мире задач</p>
      <div className="absolute top-0 right-0">
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild>
                    <Link to="/settings">
                        <Settings />
                        <span className="sr-only">Настройки</span>
                    </Link>
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Настройки</p>
            </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
};

export default Header;
