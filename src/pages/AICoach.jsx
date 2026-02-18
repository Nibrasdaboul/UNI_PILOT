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
  Zap,
  MessageSquare,
  History,
  Plus,
  BookOpen,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/** Render plain text with simple markdown: ### heading, **bold**, - bullets, numbered list. No raw symbols shown. */
function renderMessageContent(text) {
  if (!text || typeof text !== 'string') return null;
  const lines = text.split('\n');
  const out = [];
  lines.forEach((line, j) => {
    const key = `line-${j}`;
    const trim = line.trim();
    // ### heading → heading block (no ### shown)
    if (/^###\s+/.test(line)) {
      const t = line.replace(/^###\s+/, '').trim();
      out.push(<div key={key} className="font-semibold text-foreground mt-4 mb-1 first:mt-0">{renderInlineBold(t)}</div>);
      return;
    }
    if (/^##\s+/.test(line)) {
      const t = line.replace(/^##\s+/, '').trim();
      out.push(<div key={key} className="font-semibold text-foreground mt-3 mb-1">{renderInlineBold(t)}</div>);
      return;
    }
    // - item or - **label**: rest
    if (/^-\s+/.test(line)) {
      const t = line.replace(/^-\s+/, '').trim();
      out.push(<div key={key} className="flex gap-2 mt-1"><span className="shrink-0">-</span><span>{renderInlineBold(t)}</span></div>);
      return;
    }
    // numbered 1. 2. (keep number, only style)
    if (/^\d+\.\s+/.test(line)) {
      out.push(<div key={key} className="mt-1">{renderInlineBold(trim)}</div>);
      return;
    }
    if (trim === '') {
      out.push(<div key={key} className="h-2" />);
      return;
    }
    out.push(<p key={key} className={j > 0 ? 'mt-2' : ''}>{renderInlineBold(trim)}</p>);
  });
  return out;
}

function renderInlineBold(str) {
  const parts = [];
  let rest = str;
  let key = 0;
  while (rest.length) {
    const m = rest.match(/\*\*([^*]+)\*\*/);
    if (!m) {
      parts.push(<span key={key}>{rest}</span>);
      break;
    }
    const before = rest.slice(0, m.index);
    if (before) parts.push(<span key={key}>{before}</span>);
    key += 1;
    parts.push(<strong key={key} className="font-semibold">{m[1]}</strong>);
    key += 1;
    rest = rest.slice(m.index + m[0].length);
  }
  return parts.length === 1 ? parts[0] : <span>{parts}</span>;
}

const WELCOME_MSG = (lang) =>
  lang === 'ar'
    ? 'مرحباً! أنا أستاذك الذكي في يوني بايلوت. كيف يمكنني مساعدتك في دراستك اليوم؟ يمكنني تحليل أدائك، إنشاء خطط دراسية، أو الإجابة على الأسئلة الأكاديمية المعقدة.'
    : "Hello! I'm your UniPilot AI Professor. How can I help you with your studies today? I can analyze your performance, create study plans, or answer complex academic questions.";

export default function AICoach() {
  const { api } = useAuth();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState([{ id: 1, role: 'assistant', content: WELCOME_MSG(language) }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const welcome = WELCOME_MSG(language);
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === 'assistant') return [{ id: 1, role: 'assistant', content: welcome }];
      return prev;
    });
  }, [language]);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/ai/conversations');
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch {
      setConversations([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleSend = async (userMessageOverride = null) => {
    const text = (userMessageOverride ?? input).trim();
    if (!text || isLoading) return;

    setInput('');
    const userMessage = text;
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      let cid = currentConversationId;
      if (cid == null) {
        const createRes = await api.post('/ai/conversations', {});
        cid = createRes.data?.id ?? null;
        if (cid != null) setCurrentConversationId(cid);
      }
      const payload = {
        messages: [...messages, { role: 'user', content: userMessage }],
        ...(cid != null ? { conversation_id: cid } : {}),
      };
      const response = await api.post('/ai/chat', payload);
      const reply = response.data?.content ?? '';
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', content: reply }]);
      if (cid != null) fetchConversations();
    } catch (error) {
      console.error('AI Error:', error);
      const msg =
        error.response?.data?.detail ||
        error.message ||
        (language === 'ar' ? 'الأستاذ الذكي غير متاح حالياً' : 'The AI Professor is currently unavailable');
      toast.error(typeof msg === 'string' ? msg : (language === 'ar' ? 'حدث خطأ في الاتصال بالذكاء الاصطناعي' : 'AI connection error'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversation = async (id) => {
    try {
      setHistoryOpen(false);
      const res = await api.get(`/ai/conversations/${id}`);
      const list = res.data?.messages ?? [];
      const msgs = list.length
        ? list.map((m, i) => ({ id: m.id || i + 1, role: m.role, content: m.content }))
        : [{ id: 1, role: 'assistant', content: WELCOME_MSG(language) }];
      setMessages(msgs);
      setCurrentConversationId(id);
    } catch {
      toast.error(language === 'ar' ? 'تعذر تحميل المحادثة' : 'Could not load conversation');
    }
  };

  const handleClear = () => {
    setMessages([{ id: 1, role: 'assistant', content: WELCOME_MSG(language) }]);
    setCurrentConversationId(null);
  };

  const handleDeleteConversation = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) handleClear();
    } catch {
      toast.error(language === 'ar' ? 'تعذر حذف المحادثة' : 'Could not delete conversation');
    }
  };

  const handleSuggestion = (text, sendNow = false) => {
    if (sendNow) {
      setInput(text);
      setTimeout(() => handleSend(text), 0);
    } else {
      setInput(text);
    }
  };

  const presetPrompts = [
    { icon: BrainCircuit, title: language === 'ar' ? 'تحليل الأداء' : 'Performance', text: language === 'ar' ? 'حلل أدائي الأكاديمي وأعطني نصائح عملية لتحسينه' : 'Analyze my academic performance and give me practical tips to improve' },
    { icon: Target, title: language === 'ar' ? 'التحضير للامتحان' : 'Exam prep', text: language === 'ar' ? 'ما أفضل طريقة للتحضير للاختبار القادم؟ أعطني خطة يومية واضحة' : "What's the best way to prepare for my next exam? Give me a clear daily plan" },
    { icon: Zap, title: language === 'ar' ? 'خطة دراسية' : 'Study plan', text: language === 'ar' ? 'أنشئ خطة دراسية مكثفة لـ 3 أيام تراعي وقتي وموادي' : 'Create a 3-day intensive study plan that fits my time and subjects' },
    { icon: GraduationCap, title: language === 'ar' ? 'شرح مفهوم' : 'Explain concept', text: language === 'ar' ? 'اشرح لي مفهوم البرمجة الديناميكية ببساطة مع أمثلة' : 'Explain Dynamic Programming simply with examples' },
    { icon: Clock, title: language === 'ar' ? 'إدارة الوقت' : 'Time management', text: language === 'ar' ? 'كيف أنظم وقتي بين المواد والواجبات دون إرهاق؟' : 'How do I organize my time between subjects and assignments without burning out?' },
    { icon: BookOpen, title: language === 'ar' ? 'طريقة المذاكرة' : 'Study method', text: language === 'ar' ? 'ما أفضل طريقة للمذاكرة الفعّالة والحفظ طويل المدى؟' : 'What is the best method for effective studying and long-term retention?' },
    { icon: HelpCircle, title: language === 'ar' ? 'حل مسألة' : 'Solve problem', text: language === 'ar' ? 'ساعدني في فهم خطوات حل هذه المسألة خطوة بخطوة' : 'Help me understand the steps to solve this problem step by step' },
    { icon: MessageSquare, title: language === 'ar' ? 'تحفيز ونصائح' : 'Motivation', text: language === 'ar' ? 'أشعر بالإحباط من الدرجات، أعطني نصائح لرفع همتي ومستواي' : 'I feel discouraged about my grades, give me tips to boost my motivation and performance' },
  ];

  const historyList = (
    <>
      {loadingHistory ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : conversations.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">{language === 'ar' ? 'لا محادثات بعد' : 'No conversations yet'}</p>
      ) : (
        <ul className="space-y-1">
          {conversations.map((c) => (
            <li key={c.id}>
              <div
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2.5 text-left cursor-pointer group',
                  currentConversationId === c.id ? 'bg-primary/15 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'
                )}
                onClick={() => loadConversation(c.id)}
              >
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 min-w-0 truncate text-sm font-medium">{c.title || (language === 'ar' ? 'محادثة' : 'Chat')}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleDeleteConversation(e, c.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 gap-3 sm:gap-4 min-h-0 [min-height:70vh] lg:[min-height:calc(100vh-11rem)]" data-testid="ai-coach-page">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold font-display tracking-tight truncate">{t('aiChat.title')}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              {t('aiChat.onlineReady')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile: History in Sheet */}
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full gap-1.5 lg:hidden">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">{language === 'ar' ? 'المحادثات' : 'History'}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side={language === 'ar' ? 'right' : 'left'} className="flex flex-col p-0 w-full max-w-[280px] sm:max-w-[320px]">
              <SheetHeader className="p-4 border-b shrink-0">
                <SheetTitle className="text-base">{language === 'ar' ? 'المحادثات السابقة' : 'Previous chats'}</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 p-3">
                {historyList}
              </ScrollArea>
            </SheetContent>
          </Sheet>
          <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={handleClear}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">{language === 'ar' ? 'جديد' : 'New'}</span>
          </Button>
          <Button variant="outline" size="sm" className="rounded-full gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5" onClick={handleClear}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main: sidebar + content */}
      <div className="flex flex-1 min-h-0 gap-3 sm:gap-4 overflow-hidden">
        {/* History sidebar - desktop only */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 shrink-0 border rounded-2xl bg-card/50 overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b shrink-0">
            <History className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold truncate">{language === 'ar' ? 'المحادثات' : 'Chats'}</span>
          </div>
          <ScrollArea className="flex-1 min-h-0 p-2">
            {historyList}
          </ScrollArea>
        </aside>

        {/* Chat + prompts */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-hidden">
          {/* Prompts: horizontal scroll on all devices */}
          <div className="shrink-0">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider truncate">
              {language === 'ar' ? 'اقتراحات جاهزة' : 'Ready prompts'}
            </p>
            <div className="overflow-x-auto overflow-y-hidden pb-1 -mx-1 px-1 scrollbar-thin">
              <div className="flex gap-2 w-max min-w-full">
                {presetPrompts.map((item, i) => (
                  <div key={i} className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      className="p-2.5 sm:p-3 rounded-xl border bg-card/50 text-left hover:border-primary/50 hover:shadow transition-all w-[140px] sm:w-[180px] min-h-[60px] sm:min-h-0"
                      onClick={() => handleSuggestion(item.text, false)}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
                        <span className="text-[11px] sm:text-xs font-bold truncate">{item.title}</span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-2 leading-snug">{item.text}</p>
                    </button>
                    <Button
                      size="sm"
                      variant="default"
                      className="rounded-xl h-9 w-9 shrink-0 p-0"
                      title={language === 'ar' ? 'أرسل الآن' : 'Send now'}
                      onClick={() => handleSuggestion(item.text, true)}
                      disabled={isLoading}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat card */}
          <Card className="flex-1 min-h-0 flex flex-col rounded-2xl border shadow-sm overflow-hidden">
            <CardContent className="flex-1 p-0 flex flex-col min-h-0 overflow-hidden">
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 sm:p-6 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-3 max-w-[95%] sm:max-w-[85%]',
                        message.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                      )}
                    >
                      <Avatar className={cn('w-8 h-8 sm:w-10 sm:h-10 border-2 shrink-0', message.role === 'assistant' ? 'border-primary/20' : 'border-secondary/20')}>
                        <AvatarFallback className={message.role === 'assistant' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}>
                          {message.role === 'assistant' ? <Bot className="w-4 h-4 sm:w-5 sm:h-5" /> : <User className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          'p-3 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm break-words',
                          message.role === 'assistant' ? 'bg-muted/50 border rounded-tl-none' : 'bg-primary text-primary-foreground rounded-tr-none'
                        )}
                      >
                        {message.role === 'assistant' ? renderMessageContent(message.content) : message.content.split('\n').map((line, j) => (
                          <p key={j} className={j > 0 ? 'mt-2' : ''}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 mr-auto max-w-[85%]">
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-primary/20 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary"><Bot className="w-4 h-4 sm:w-5 sm:h-5" /></AvatarFallback>
                      </Avatar>
                      <div className="p-3 sm:p-5 rounded-2xl bg-muted/50 border rounded-tl-none flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                        <span className="text-xs sm:text-sm font-medium animate-pulse">{t('aiChat.thinking')}</span>
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              <div className="p-3 sm:p-4 border-t bg-muted/20 shrink-0">
                <div className="relative flex items-center gap-2">
                  <Input
                    placeholder={t('aiChat.askAnything')}
                    className="h-12 sm:h-14 pl-4 sm:pl-6 pr-12 sm:pr-14 rounded-full border-primary/10 text-sm sm:text-base"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    data-testid="ai-coach-input"
                  />
                  <Button
                    size="icon"
                    className="absolute right-2 rtl:right-auto rtl:left-2 h-9 w-9 sm:h-10 sm:w-10 rounded-full shrink-0"
                    onClick={() => handleSend()}
                    disabled={isLoading || !input.trim()}
                    data-testid="ai-coach-send"
                  >
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </div>
                <p className="text-[10px] text-center mt-2 text-muted-foreground flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary shrink-0" />
                  {t('aiChat.poweredBy')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
