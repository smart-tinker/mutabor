import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Task, Message } from '@/types';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from "@/hooks/use-toast";
import { Link } from 'react-router-dom';

const API_KEY_STORAGE_KEY = 'mutabor_google_api_key';

interface AiChatModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

const AiChatModal = ({ task, isOpen, onClose }: AiChatModalProps) => {
  const [apiKey, setApiKey] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
    } else {
      setApiKey('');
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (task) {
        setMessages([{
            role: 'model',
            parts: [{ text: `Привет! Я готов обсудить задачу: "${task.title}". Что вас интересует?` }]
        }]);
    }
  }, [task]);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', parts: [{ text: userInput }] }];
    setMessages(newMessages);
    setUserInput('');
    setIsLoading(true);

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: newMessages,
                 generationConfig: {
                    temperature: 0.7,
                    topP: 1,
                    topK: 1,
                    maxOutputTokens: 2048,
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Ошибка при запросе к AI');
        }

        const data = await response.json();
        const modelResponse = data.candidates[0].content;
        
        setMessages(prev => [...prev, modelResponse]);

    } catch (error: any) {
        console.error(error);
        toast({ title: "Ошибка", description: error.message, variant: "destructive" });
        setMessages(prev => prev.slice(0, -1)); // remove user message on error
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col bg-secondary">
        <DialogHeader>
          <DialogTitle>Диалог с AI</DialogTitle>
          <DialogDescription>Обсуждение задачи: {task?.title}</DialogDescription>
        </DialogHeader>
        {!apiKey ? (
          <div className="flex-grow flex flex-col items-center justify-center gap-4 text-center">
            <p className="text-muted-foreground">Для использования AI-помощника, пожалуйста, укажите ваш Google API ключ в настройках.</p>
            <Button asChild>
                <Link to="/settings" onClick={onClose}>Перейти в настройки</Link>
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-grow h-full pr-4 -mr-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div key={index} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      "max-w-[75%] rounded-lg px-4 py-2",
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background'
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{msg.parts[0].text}</p>
                    </div>
                  </div>
                ))}
                 {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-background rounded-lg px-4 py-2">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:0.2s]"></div>
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:0.4s]"></div>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
               <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex w-full gap-2 items-center">
                    <Input 
                        placeholder="Спросите что-нибудь..."
                        value={userInput}
                        onChange={e => setUserInput(e.target.value)}
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !userInput.trim()} className="glow-on-hover">
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AiChatModal;
