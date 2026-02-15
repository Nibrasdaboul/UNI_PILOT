import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Trash2, 
  Loader2,
  BrainCircuit,
  GraduationCap,
  Target,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AICoach() {
  const { api, user } = useAuth();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState([
    { 
      id: 1,
      role: 'assistant', 
      content: language === 'ar' 
        ? "مرحباً! أنا أستاذك الذكي في يوني بايلوت. كيف يمكنني مساعدتك في دراستك اليوم؟ يمكنني تحليل أدائك، إنشاء خطط دراسية، أو الإجابة على الأسئلة الأكاديمية المعقدة."
        : "Hello! I'm your UniPilot AI Professor. How can I help you with your studies today? I can analyze your performance, create study plans, or answer complex academic questions." 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Use summarize endpoint for general AI chat
      const response = await api.post('/ai/summarize', { text: userMessage });
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: response.data.summary }]);
    } catch (error) {
      console.error('AI Error:', error);
      toast.error(language === 'ar' ? 'الأستاذ الذكي غير متاح حالياً' : 'The AI Professor is currently unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestion = (text) => {
    setInput(text);
  };

  const handleClear = () => {
    setMessages([{
      id: 1,
      role: 'assistant',
      content: language === 'ar' 
        ? "مرحباً! أنا أستاذك الذكي في يوني بايلوت. كيف يمكنني مساعدتك في دراستك اليوم؟"
        : "Hello! I'm your UniPilot AI Professor. How can I help you with your studies today?"
    }]);
  };

  const suggestions = [
    {
      icon: BrainCircuit,
      title: t('aiChat.analysis'),
      desc: language === 'ar' ? 'حلل أدائي الأكاديمي وأعطني نصائح' : 'Analyze my academic performance and give tips',
    },
    {
      icon: Target,
      title: t('aiChat.strategy'),
      desc: language === 'ar' ? 'ما أفضل طريقة للتحضير للاختبار القادم؟' : 'What\'s the best way to prepare for my next exam?',
    },
    {
      icon: Zap,
      title: t('aiChat.plannerSuggestion'),
      desc: language === 'ar' ? 'أنشئ خطة دراسية مكثفة لـ 3 أيام' : 'Create a 3-day intensive study plan',
    },
    {
      icon: GraduationCap,
      title: t('aiChat.explanation'),
      desc: language === 'ar' ? 'اشرح لي مفهوم البرمجة الديناميكية ببساطة' : 'Explain Dynamic Programming simply',
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-5xl mx-auto space-y-4" data-testid="ai-coach-page">
      <div className="flex items-center justify-between shrink-0 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-display tracking-tight">{t('aiChat.title')}</h2>
            <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {t('aiChat.onlineReady')}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 hover:border-destructive/30"
          onClick={handleClear}
        >
          <Trash2 className="w-4 h-4" />
          {t('aiChat.clearChat')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
        {/* Suggestion Sidebar */}
        <div className="hidden lg:flex flex-col gap-4">
          {suggestions.map((item, i) => (
            <button 
              key={i}
              className="p-4 rounded-2xl border bg-card/50 backdrop-blur-sm text-left hover:border-primary/50 hover:shadow-lg transition-all duration-300 group"
              onClick={() => handleSuggestion(item.desc)}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </span>
              </div>
              <p className="text-xs font-medium text-foreground leading-relaxed">{item.desc}</p>
            </button>
          ))}
        </div>

        {/* Chat Area */}
        <Card className="lg:col-span-3 flex flex-col rounded-[2rem] border shadow-xl overflow-hidden bg-card/50 backdrop-blur-xl">
          <CardContent className="flex-1 p-0 flex flex-col h-full">
            <ScrollArea className="flex-1 p-8">
              <div className="space-y-6">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={cn(
                      "flex gap-4 max-w-[85%]",
                      message.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <Avatar className={cn(
                      "w-10 h-10 border-2 shadow-sm shrink-0",
                      message.role === 'assistant' ? "border-primary/20" : "border-secondary/20"
                    )}>
                      <AvatarFallback className={message.role === 'assistant' ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}>
                        {message.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "p-5 rounded-2xl text-sm leading-relaxed shadow-sm",
                      message.role === 'assistant' 
                        ? "bg-muted/50 border text-foreground rounded-tl-none" 
                        : "bg-primary text-primary-foreground rounded-tr-none"
                    )}>
                      {message.content.split('\n').map((line, j) => (
                        <p key={j} className={j > 0 ? "mt-2" : ""}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-4 mr-auto">
                    <Avatar className="w-10 h-10 border-2 border-primary/20 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary"><Bot className="w-5 h-5" /></AvatarFallback>
                    </Avatar>
                    <div className="p-5 rounded-2xl bg-muted/50 border text-foreground rounded-tl-none flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm font-medium animate-pulse">{t('aiChat.thinking')}</span>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="p-6 border-t bg-muted/20">
              <div className="relative flex items-center gap-2">
                <Input 
                  placeholder={t('aiChat.askAnything')}
                  className="h-14 pl-6 pr-14 rounded-full border-primary/10 focus-visible:ring-primary shadow-inner bg-background/80"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  data-testid="ai-coach-input"
                />
                <Button 
                  size="icon" 
                  className="absolute right-2 h-10 w-10 rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  data-testid="ai-coach-send"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-[10px] text-center mt-3 text-muted-foreground uppercase font-bold tracking-widest flex items-center justify-center gap-2">
                <Sparkles className="w-3 h-3 text-primary" />
                {t('aiChat.poweredBy')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
