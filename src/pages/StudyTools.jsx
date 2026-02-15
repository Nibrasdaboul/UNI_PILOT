import { useState } from 'react';
import { 
  Sparkles, 
  FileText, 
  Zap, 
  BrainCircuit,
  CheckCircle2,
  Loader2,
  Copy,
  Download
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function StudyTools() {
  const { api } = useAuth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('summarizer');
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const handleSummarize = async () => {
    if (!inputText.trim()) return;
    setIsGenerating(true);
    setResult(null);
    try {
      const response = await api.post('/ai/summarize', { text: inputText });
      setResult(response.data.summary);
      toast.success(language === 'ar' ? 'تم إنشاء الملخص!' : 'Summary generated!');
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل في إنشاء الملخص' : 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFlashcards = async () => {
    if (!inputText.trim()) return;
    setIsGenerating(true);
    setResult(null);
    try {
      const response = await api.post('/ai/generate_flashcards', { text: inputText, count: 5 });
      setResult(response.data.flashcards);
      toast.success(language === 'ar' ? 'تم إنشاء البطاقات!' : 'Flashcards generated!');
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل في إنشاء البطاقات' : 'Failed to generate flashcards');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuiz = async () => {
    if (!inputText.trim()) return;
    setIsGenerating(true);
    setResult(null);
    try {
      const response = await api.post('/ai/generate_quiz', { text: inputText, count: 3 });
      setResult(response.data.quiz);
      toast.success(language === 'ar' ? 'تم إنشاء الاختبار!' : 'Quiz generated!');
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل في إنشاء الاختبار' : 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (activeTab === 'summarizer') handleSummarize();
    else if (activeTab === 'flashcards') handleFlashcards();
    else if (activeTab === 'quiz') handleQuiz();
  };

  const handleCopy = () => {
    if (typeof result === 'string') {
      navigator.clipboard.writeText(result);
    } else {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    }
    toast.success(language === 'ar' ? 'تم النسخ!' : 'Copied!');
  };

  return (
    <div className="space-y-8 pb-12" data-testid="study-tools-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-display tracking-tight text-foreground">
            {t('studyTools.title')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('studyTools.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Input Area */}
        <Card className="lg:col-span-3 rounded-[2rem] border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="px-8 pt-8 pb-4">
            <CardTitle className="text-xl font-display">{t('studyTools.inputHub')}</CardTitle>
            <CardDescription>{t('studyTools.pasteNotes')}</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8 space-y-6">
            <Textarea 
              placeholder={t('studyTools.startTyping')}
              className="min-h-[350px] rounded-2xl border-primary/10 focus-visible:ring-primary text-base leading-relaxed bg-background/50 resize-none p-6"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              data-testid="study-tools-input"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ToolButton 
                title={t('studyTools.summarizer')} 
                icon={FileText} 
                active={activeTab === 'summarizer'}
                onClick={() => { setActiveTab('summarizer'); setResult(null); }}
              />
              <ToolButton 
                title={t('studyTools.flashcards')} 
                icon={Zap} 
                active={activeTab === 'flashcards'}
                onClick={() => { setActiveTab('flashcards'); setResult(null); }}
              />
              <ToolButton 
                title={t('studyTools.quizSimulator')} 
                icon={BrainCircuit} 
                active={activeTab === 'quiz'}
                onClick={() => { setActiveTab('quiz'); setResult(null); }}
              />
            </div>
            <Button 
              size="lg" 
              className="w-full h-14 rounded-2xl font-bold gap-3 text-lg shadow-xl shadow-primary/20"
              disabled={isGenerating || !inputText.trim()}
              onClick={handleGenerate}
              data-testid="study-tools-generate"
            >
              {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
              {t('studyTools.generate')} {activeTab === 'summarizer' ? t('studyTools.summarizer') : activeTab === 'flashcards' ? t('studyTools.flashcards') : t('studyTools.quizSimulator')}
            </Button>
          </CardContent>
        </Card>

        {/* Output Area */}
        <Card className="lg:col-span-2 rounded-[2rem] border shadow-xl bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10 min-h-[550px] flex flex-col">
          <CardHeader className="px-8 pt-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-display">{t('studyTools.result')}</CardTitle>
              <CardDescription>{t('studyTools.aiGenerated')}</CardDescription>
            </div>
            {result && (
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 border border-primary/10 bg-background/50" onClick={handleCopy}>
                  <Copy className="w-4 h-4 text-primary" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="px-8 pb-8 flex-1 flex flex-col">
            {!result ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <Sparkles className="w-10 h-10" />
                </div>
                <p className="font-medium text-lg">{t('studyTools.waitingMagic')}</p>
                <p className="text-sm max-w-xs">{t('studyTools.pasteAndGenerate')}</p>
              </div>
            ) : (
              <div className="flex-1 space-y-6 animate-fade-in overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
                {activeTab === 'summarizer' && typeof result === 'string' && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {result}
                  </div>
                )}
                {activeTab === 'flashcards' && Array.isArray(result) && (
                  <div className="space-y-4">
                    {result.map((card, i) => (
                      <Card key={i} className="rounded-2xl border-primary/10 bg-background/50 group hover:shadow-md transition-all">
                        <CardContent className="p-5 space-y-3">
                          <p className="text-xs font-bold text-primary uppercase tracking-widest">{t('studyTools.question')} {i + 1}</p>
                          <p className="font-bold text-foreground">{card.question}</p>
                          <div className="pt-3 border-t border-dashed">
                            <p className="text-xs font-bold text-secondary uppercase tracking-widest">{t('studyTools.answer')}</p>
                            <p className="text-sm text-muted-foreground mt-1">{card.answer}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {activeTab === 'quiz' && Array.isArray(result) && (
                  <div className="space-y-6">
                    {result.map((item, i) => (
                      <div key={i} className="space-y-3">
                        <p className="text-sm font-bold flex gap-2">
                          <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">{i + 1}</span>
                          {item.question}
                        </p>
                        <div className="space-y-2 pl-8">
                          {item.options?.map((opt, j) => (
                            <div key={j} className={cn(
                              "p-3 rounded-xl border text-sm transition-all",
                              j === item.correctIndex 
                                ? "bg-secondary/10 border-secondary/30 text-secondary font-bold" 
                                : "bg-background/50 border-border"
                            )}>
                              {opt}
                              {j === item.correctIndex && <CheckCircle2 className="w-4 h-4 inline ml-2" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ToolButton({ title, icon: Icon, active, onClick }) {
  return (
    <button 
      className={cn(
        "p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all duration-300",
        active 
          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105" 
          : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      onClick={onClick}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
    </button>
  );
}
