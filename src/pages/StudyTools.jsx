import { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Zap,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  Copy,
  Download,
  Upload,
  Search,
  History,
  Map,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { hasArabic } from '@/lib/pdfArabic';
import { exportArabicPdf } from '@/lib/pdfArabicExport';
import MindMapDiagram from '@/components/MindMapDiagram';
import {
  drawFirstPageHeader,
  drawFooter,
  needNewPage,
  addPageWithHeader,
  drawBlockBorder,
  LINE_HEIGHT,
  LINE_HEIGHT_TITLE,
  SECTION_GAP,
  getMaxWidth,
  getTextX,
  getTextOpt,
  getMargin,
} from '@/lib/pdfTheme';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TABS = [
  { id: 'summarizer', labelKey: 'summarizer', icon: FileText },
  { id: 'flashcards', labelKey: 'flashcards', icon: Zap },
  { id: 'quiz', labelKey: 'quizSimulator', icon: BrainCircuit },
  { id: 'mindmap', labelKey: 'mindmap', icon: Map },
];

export default function StudyTools() {
  const { api } = useAuth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('summarizer');
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [resultId, setResultId] = useState(null);
  const [quizOptions, setQuizOptions] = useState({
    difficulty: 'medium',
    question_type: 'multiple_choice',
    count: 10,
    source_scope: 'within',
  });
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizSubmitted, setQuizSubmitted] = useState(null);
  const [history, setHistory] = useState({ summaries: [], flashcards: [], quizzes: [], mindmaps: [] });
  const [search, setSearch] = useState({ summaries: '', flashcards: '', quizzes: '', mindmaps: '' });

  const lang = language === 'ar' ? 'ar' : 'en';

  const fetchHistory = () => {
    api.get('/study/summaries').then((r) => setHistory((h) => ({ ...h, summaries: r.data || [] }))).catch(() => {});
    api.get('/study/flashcards/sets').then((r) => setHistory((h) => ({ ...h, flashcards: r.data || [] }))).catch(() => {});
    api.get('/study/quizzes').then((r) => setHistory((h) => ({ ...h, quizzes: r.data || [] }))).catch(() => {});
    api.get('/study/mindmaps').then((r) => setHistory((h) => ({ ...h, mindmaps: r.data || [] }))).catch(() => {});
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getInputText = () => inputText.trim();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isTxt = file.type === 'text/plain' || /\.txt$/i.test(file.name);
    if (isTxt) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const b64 = typeof dataUrl === 'string' && dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
        if (!b64) {
          setInputText(typeof dataUrl === 'string' ? dataUrl : '');
          return;
        }
        api.post('/study/upload', { file_base64: b64, filename: file.name })
          .then((r) => {
            setInputText(r.data.text || '');
            toast.success(language === 'ar' ? 'تم رفع الملف' : 'File uploaded');
          })
          .catch(() => toast.error(language === 'ar' ? 'فشل رفع الملف' : 'Upload failed'));
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setInputText(reader.result || '');
        toast.success(language === 'ar' ? 'تم تحميل النص من الملف' : 'File text loaded');
      };
      reader.readAsText(file, 'UTF-8');
    }
    e.target.value = '';
  };

  const handleSummarize = async () => {
    if (!getInputText()) return;
    setIsGenerating(true);
    setResult(null);
    setQuizSubmitted(null);
    try {
      const r = await api.post('/study/summarize', { text: getInputText(), lang });
      setResult(r.data.summary);
      setResultId(r.data.id);
      fetchHistory();
      toast.success(language === 'ar' ? 'تم إنشاء الملخص!' : 'Summary generated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'ar' ? 'فشل إنشاء الملخص' : 'Failed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFlashcards = async () => {
    if (!getInputText()) return;
    setIsGenerating(true);
    setResult(null);
    setQuizSubmitted(null);
    try {
      const r = await api.post('/study/flashcards', { text: getInputText(), count: 15, lang });
      setResult(r.data.flashcards);
      setResultId(r.data.set_id);
      fetchHistory();
      toast.success(language === 'ar' ? 'تم إنشاء البطاقات!' : 'Flashcards generated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'ar' ? 'فشل' : 'Failed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuizGenerate = async () => {
    if (!getInputText()) return;
    setIsGenerating(true);
    setResult(null);
    setQuizSubmitted(null);
    setQuizAnswers([]);
    try {
      const r = await api.post('/study/quiz', {
        text: getInputText(),
        lang,
        count: quizOptions.count,
        difficulty: quizOptions.difficulty,
        question_type: quizOptions.question_type,
        source_scope: quizOptions.source_scope,
      });
      setResult(r.data.quiz);
      setResultId(r.data.id);
      setQuizAnswers(r.data.quiz.map(() => null));
      fetchHistory();
      toast.success(language === 'ar' ? 'تم إنشاء الاختبار!' : 'Quiz generated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'ar' ? 'فشل' : 'Failed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuizSubmit = async () => {
    if (!resultId || !Array.isArray(result)) return;
    try {
      const r = await api.post(`/study/quizzes/${resultId}/submit`, { answers: quizAnswers, lang });
      setQuizSubmitted(r.data);
      toast.success(language === 'ar' ? 'تم التصحيح' : 'Submitted');
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'ar' ? 'فشل' : 'Failed'));
    }
  };

  const handleMindmap = async () => {
    if (!getInputText()) return;
    setIsGenerating(true);
    setResult(null);
    setQuizSubmitted(null);
    try {
      const r = await api.post('/study/mindmap', { text: getInputText(), lang });
      setResult(r.data.mind_map);
      setResultId(r.data.id);
      fetchHistory();
      toast.success(language === 'ar' ? 'تم إنشاء الخريطة الذهنية!' : 'Mind map generated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'ar' ? 'فشل' : 'Failed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (activeTab === 'summarizer') handleSummarize();
    else if (activeTab === 'flashcards') handleFlashcards();
    else if (activeTab === 'quiz') handleQuizGenerate();
    else if (activeTab === 'mindmap') handleMindmap();
  };

  const loadFromHistory = (type, item) => {
    if (type === 'summaries') {
      api.get(`/study/summaries/${item.id}`).then((r) => {
        setResult(r.data.content);
        setResultId(r.data.id);
        setActiveTab('summarizer');
      });
    } else if (type === 'flashcards') {
      api.get(`/study/flashcards/sets/${item.id}`).then((r) => {
        setResult(r.data.flashcards?.map((c) => ({ front: c.front, back: c.back })) || []);
        setResultId(r.data.id);
        setActiveTab('flashcards');
      });
    } else if (type === 'quizzes') {
      api.get(`/study/quizzes/${item.id}`).then((r) => {
        setResult(r.data.questions);
        setResultId(r.data.id);
        setQuizAnswers((r.data.questions || []).map(() => null));
        setQuizSubmitted(null);
        setActiveTab('quiz');
      });
    } else if (type === 'mindmaps') {
      api.get(`/study/mindmaps/${item.id}`).then((r) => {
        setResult(r.data.mind_map);
        setResultId(r.data.id);
        setActiveTab('mindmap');
      });
    }
  };

  const exportPdf = async () => {
    try {
      const contentStr = result == null ? '' : (typeof result === 'string' ? result : JSON.stringify(result));
      const useArabic = language === 'ar' || hasArabic(contentStr);

      if (useArabic) {
        toast.info(language === 'ar' ? 'جاري إنشاء PDF بالعربية...' : 'Creating Arabic PDF...');
        const doc = await exportArabicPdf(activeTab, result, language);
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `study-${activeTab}-${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(language === 'ar' ? 'تم تنزيل PDF' : 'PDF downloaded');
        return;
      }

      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const maxWidth = getMaxWidth();
      doc.setFont('helvetica', 'normal');

      const textX = getTextX(false);
      const textOpt = getTextOpt(false);
      const docTitles = {
        summarizer: { title: 'Summary', sub: 'Study Tools - UniPilot' },
        flashcards: { title: 'Flashcards', sub: 'Study Tools - UniPilot' },
        quiz: { title: 'Quiz', sub: 'Study Tools - UniPilot' },
        mindmap: { title: 'Mind Map', sub: 'Study Tools - UniPilot' },
      };
      const { title: docTitle, sub: subtitle } = docTitles[activeTab] || docTitles.summarizer;

      let y = drawFirstPageHeader(doc, docTitle, subtitle, false);
      let pageNum = 1;
      doc.setFontSize(10);

      const ensureSpace = (requiredY) => {
        if (!needNewPage(y + requiredY)) return;
        const next = addPageWithHeader(doc, pageNum, false);
        y = next.y;
        pageNum = next.pageNum;
      };

      if (activeTab === 'summarizer' && typeof result === 'string') {
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(result, maxWidth);
        for (const line of lines) {
          ensureSpace(LINE_HEIGHT);
          doc.text(line, textX, y, textOpt);
          y += LINE_HEIGHT;
        }
      } else if (activeTab === 'flashcards' && Array.isArray(result)) {
        result.forEach((card, i) => {
          const frontLines = doc.splitTextToSize((card.front || card.question || '').slice(0, 300), maxWidth - 4);
          const backLines = doc.splitTextToSize((card.back || card.answer || '').slice(0, 300), maxWidth - 4);
          const cardHeight = LINE_HEIGHT_TITLE + frontLines.length * LINE_HEIGHT + 4 + LINE_HEIGHT + backLines.length * LINE_HEIGHT + SECTION_GAP;
          ensureSpace(cardHeight);
          const cardStartY = y;
          drawBlockBorder(doc, getMargin(), cardStartY, maxWidth, cardHeight - SECTION_GAP * 0.5);
          doc.setFontSize(11);
          doc.setFont(doc.getFont().fontName, 'bold');
          doc.text('Card ' + (i + 1), textX, y + 2, textOpt);
          y += LINE_HEIGHT_TITLE + 1;
          doc.setFont(doc.getFont().fontName, 'normal');
          doc.setFontSize(9);
          doc.text('Front:', textX, y, textOpt);
          y += LINE_HEIGHT;
          frontLines.forEach((l) => { doc.text(l, textX, y, textOpt); y += LINE_HEIGHT; });
          y += 2;
          doc.text('Back:', textX, y, textOpt);
          y += LINE_HEIGHT;
          backLines.forEach((l) => { doc.text(l, textX, y, textOpt); y += LINE_HEIGHT; });
          y += SECTION_GAP;
        });
      } else if (activeTab === 'quiz' && Array.isArray(result)) {
        result.forEach((q, i) => {
          const qLines = doc.splitTextToSize((q.question || '').slice(0, 400), maxWidth - 6);
          const optCount = (q.options || []).length;
          const blockHeight = LINE_HEIGHT_TITLE + qLines.length * LINE_HEIGHT + optCount * LINE_HEIGHT + SECTION_GAP;
          ensureSpace(blockHeight);
          doc.setFontSize(11);
          doc.setFont(doc.getFont().fontName, 'bold');
          doc.text(`${i + 1}.`, textX, y, textOpt);
          y += LINE_HEIGHT;
          doc.setFont(doc.getFont().fontName, 'normal');
          qLines.forEach((l) => { doc.text(l, textX, y, textOpt); y += LINE_HEIGHT; });
          (q.options || []).forEach((opt, j) => {
            doc.text(`   ${String.fromCharCode(65 + j)}. ${opt}`, textX, y, textOpt);
            y += LINE_HEIGHT;
          });
          y += SECTION_GAP;
        });
      } else if (activeTab === 'mindmap' && result && typeof result === 'object') {
        const dump = (node, depth) => {
          const indent = '    '.repeat(depth);
          const label = (node.label || '').slice(0, 120);
          const lines = doc.splitTextToSize(indent + label, maxWidth - 4);
          ensureSpace(lines.length * LINE_HEIGHT);
          doc.setFontSize(depth === 0 ? 11 : 10);
          if (depth === 0) doc.setFont(doc.getFont().fontName, 'bold');
          lines.forEach((l) => { doc.text(l, textX, y, textOpt); y += LINE_HEIGHT; });
          if (depth === 0) doc.setFont(doc.getFont().fontName, 'normal');
          (node.children || []).forEach((c) => dump(c, depth + 1));
        };
        dump(result, 0);
      }

      drawFooter(doc, pageNum, false);

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-${activeTab}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(language === 'ar' ? 'تم تنزيل PDF' : 'PDF downloaded');
    } catch (err) {
      console.error(err);
      toast.error(language === 'ar' ? 'فشل إنشاء PDF' : 'PDF failed');
    }
  };

  const filteredSummaries = history.summaries.filter((s) => !search.summaries || (s.title || '').toLowerCase().includes(search.summaries.toLowerCase()) || (s.content || '').toLowerCase().includes(search.summaries.toLowerCase()));
  const filteredFlashcards = history.flashcards.filter((s) => !search.flashcards || (s.title || '').toLowerCase().includes(search.flashcards.toLowerCase()));
  const filteredQuizzes = history.quizzes.filter((s) => !search.quizzes || (s.title || '').toLowerCase().includes(search.quizzes.toLowerCase()));
  const filteredMindmaps = history.mindmaps.filter((s) => !search.mindmaps || (s.title || '').toLowerCase().includes(search.mindmaps.toLowerCase()));

  const canGenerate = getInputText() && !isGenerating;
  const isQuiz = activeTab === 'quiz';

  return (
    <div className="space-y-6 pb-12" data-testid="study-tools-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">{t('studyTools.title')}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t('studyTools.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <Card className="rounded-2xl border p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{language === 'ar' ? 'السجل' : 'History'}</span>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">{language === 'ar' ? 'ملخصات' : 'Summaries'}</span>
              <Input
                placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                value={search.summaries}
                onChange={(e) => setSearch((s) => ({ ...s, summaries: e.target.value }))}
                className="h-9 rounded-lg"
              />
              <ScrollArea className="h-[120px]">
                {filteredSummaries.slice(0, 10).map((s) => (
                  <button key={s.id} type="button" className="block w-full text-left text-xs p-2 rounded-lg hover:bg-muted truncate" onClick={() => loadFromHistory('summaries', s)}>{s.title || s.id}</button>
                ))}
              </ScrollArea>
            </div>
            <div className="text-xs text-muted-foreground mt-2">{language === 'ar' ? 'بطاقات تعليمية' : 'Flashcards'}</div>
            <Input placeholder={language === 'ar' ? 'بحث...' : 'Search'} value={search.flashcards} onChange={(e) => setSearch((s) => ({ ...s, flashcards: e.target.value }))} className="h-9 rounded-lg mt-1" />
            <ScrollArea className="h-[80px] mt-1">
              {filteredFlashcards.slice(0, 5).map((s) => (
                <button key={s.id} type="button" className="block w-full text-left text-xs p-2 rounded-lg hover:bg-muted truncate" onClick={() => loadFromHistory('flashcards', s)}>{s.title || s.id}</button>
              ))}
            </ScrollArea>
            <div className="text-xs text-muted-foreground mt-2">{language === 'ar' ? 'اختبارات' : 'Quizzes'}</div>
            <Input placeholder={language === 'ar' ? 'بحث...' : 'Search'} value={search.quizzes} onChange={(e) => setSearch((s) => ({ ...s, quizzes: e.target.value }))} className="h-9 rounded-lg mt-1" />
            <ScrollArea className="h-[80px] mt-1">
              {filteredQuizzes.slice(0, 5).map((s) => (
                <button key={s.id} type="button" className="block w-full text-left text-xs p-2 rounded-lg hover:bg-muted truncate" onClick={() => loadFromHistory('quizzes', s)}>{s.title || s.id}</button>
              ))}
            </ScrollArea>
            <div className="text-xs text-muted-foreground mt-2">{language === 'ar' ? 'خرائط ذهنية' : 'Mind maps'}</div>
            <Input placeholder={language === 'ar' ? 'بحث...' : 'Search'} value={search.mindmaps} onChange={(e) => setSearch((s) => ({ ...s, mindmaps: e.target.value }))} className="h-9 rounded-lg mt-1" />
            <ScrollArea className="h-[80px] mt-1">
              {filteredMindmaps.slice(0, 5).map((s) => (
                <button key={s.id} type="button" className="block w-full text-left text-xs p-2 rounded-lg hover:bg-muted truncate" onClick={() => loadFromHistory('mindmaps', s)}>{s.title || s.id}</button>
              ))}
            </ScrollArea>
          </Card>
        </div>

        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-xl">{t('studyTools.inputHub')}</CardTitle>
              <CardDescription>{language === 'ar' ? 'ارفع ملفاً (نص أو TXT) أو الصق النص' : 'Upload a file (text/TXT) or paste text'}</CardDescription>
              <div className="flex flex-wrap gap-2 mt-2">
                <label className="cursor-pointer">
                  <input type="file" accept=".txt,text/plain" className="hidden" onChange={handleFileChange} />
                  <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" asChild><span><Upload className="w-4 h-4" />{language === 'ar' ? 'رفع ملف' : 'Upload file'}</span></Button>
                </label>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <Textarea
                placeholder={t('studyTools.startTyping')}
                className="min-h-[220px] rounded-2xl border-primary/10 text-base leading-relaxed resize-none p-4"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                data-testid="study-tools-input"
              />
              <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={cn(
                      'p-3 rounded-xl border flex items-center gap-2 transition-all',
                      activeTab === tab.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 hover:bg-muted'
                    )}
                    onClick={() => { setActiveTab(tab.id); setResult(null); setQuizSubmitted(null); }}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="text-xs font-bold">{t(`studyTools.${tab.labelKey}`)}</span>
                  </button>
                ))}
              </div>

              {isQuiz && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/30 border">
                  <div>
                    <Label className="text-xs">{language === 'ar' ? 'صعوبة' : 'Difficulty'}</Label>
                    <Select value={quizOptions.difficulty} onValueChange={(v) => setQuizOptions((o) => ({ ...o, difficulty: v }))}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="very_hard">{language === 'ar' ? 'صعب جداً' : 'Very hard'}</SelectItem>
                        <SelectItem value="hard">{language === 'ar' ? 'صعب' : 'Hard'}</SelectItem>
                        <SelectItem value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</SelectItem>
                        <SelectItem value="easy">{language === 'ar' ? 'سهل' : 'Easy'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{language === 'ar' ? 'نوع السؤال' : 'Question type'}</Label>
                    <Select value={quizOptions.question_type} onValueChange={(v) => setQuizOptions((o) => ({ ...o, question_type: v }))}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">{language === 'ar' ? 'اختيار من متعدد' : 'Multiple choice'}</SelectItem>
                        <SelectItem value="true_false">{language === 'ar' ? 'صح أو خطأ' : 'True/False'}</SelectItem>
                        <SelectItem value="fill_blank">{language === 'ar' ? 'املأ الفراغ' : 'Fill blank'}</SelectItem>
                        <SelectItem value="short_answer">{language === 'ar' ? 'تحريري' : 'Short answer'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{language === 'ar' ? 'عدد الأسئلة' : 'Count'}</Label>
                    <Select value={String(quizOptions.count)} onValueChange={(v) => setQuizOptions((o) => ({ ...o, count: parseInt(v, 10) }))}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[5, 10, 15, 20, 30, 50].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{language === 'ar' ? 'المصدر' : 'Source'}</Label>
                    <Select value={quizOptions.source_scope} onValueChange={(v) => setQuizOptions((o) => ({ ...o, source_scope: v }))}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="within">{language === 'ar' ? 'من داخل المقرر' : 'From material'}</SelectItem>
                        <SelectItem value="beyond">{language === 'ar' ? 'من خارج المقرر (بناءً عليه)' : 'Beyond (based on)'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Button size="lg" className="w-full h-12 rounded-2xl font-bold gap-2" disabled={!canGenerate} onClick={handleGenerate} data-testid="study-tools-generate">
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {t('studyTools.generate')} {t(`studyTools.${TABS.find((x) => x.id === activeTab)?.labelKey || 'summarizer'}`)}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm min-h-[400px] flex flex-col">
            <CardHeader className="px-6 pt-6 pb-2 flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg">{t('studyTools.result')}</CardTitle>
                <CardDescription>{t('studyTools.aiGenerated')}</CardDescription>
              </div>
              {result != null && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-full gap-1" onClick={() => { navigator.clipboard.writeText(typeof result === 'string' ? result : JSON.stringify(result)); toast.success(language === 'ar' ? 'تم النسخ' : 'Copied'); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full gap-1" onClick={exportPdf}>
                    <Download className="w-4 h-4" />
                    {language === 'ar' ? 'PDF' : 'PDF'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="px-6 pb-6 flex-1 overflow-auto">
              {result == null ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground opacity-60">
                  <Sparkles className="w-12 h-12 mb-3" />
                  <p className="font-medium">{t('studyTools.waitingMagic')}</p>
                  <p className="text-sm">{t('studyTools.pasteAndGenerate')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTab === 'summarizer' && typeof result === 'string' && (
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground/90">{result}</div>
                  )}
                  {activeTab === 'flashcards' && Array.isArray(result) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {result.map((card, i) => (
                        <Card key={i} className="rounded-xl border-primary/10">
                          <CardContent className="p-4">
                            <p className="text-xs font-bold text-primary uppercase mb-1">{t('studyTools.question')} {i + 1}</p>
                            <p className="font-medium">{card.front || card.question}</p>
                            <div className="mt-2 pt-2 border-t border-dashed">
                              <p className="text-xs font-bold text-muted-foreground uppercase">{t('studyTools.answer')}</p>
                              <p className="text-sm text-muted-foreground">{card.back || card.answer}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  {activeTab === 'quiz' && Array.isArray(result) && !quizSubmitted && (
                    <div className="space-y-6">
                      {result.map((q, i) => (
                        <div key={i} className="space-y-2">
                          <p className="font-medium flex gap-2"><span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center text-sm shrink-0">{i + 1}</span>{q.question}</p>
                          <div className="pl-8 space-y-2">
                            {(q.options || []).map((opt, j) => (
                              <label key={j} className={cn("flex items-center gap-2 p-3 rounded-xl border cursor-pointer", quizAnswers[i] === j && "border-primary bg-primary/10")}>
                                <input type="radio" name={`q-${i}`} checked={quizAnswers[i] === j} onChange={() => setQuizAnswers((a) => { const n = [...a]; n[i] = j; return n; })} />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <Button className="w-full rounded-xl" onClick={handleQuizSubmit}>{language === 'ar' ? 'إرسال وإظهار النتيجة' : 'Submit & see results'}</Button>
                    </div>
                  )}
                  {activeTab === 'quiz' && quizSubmitted && (
                    <div className="space-y-4">
                      <p className="text-lg font-bold">{language === 'ar' ? 'النتيجة' : 'Score'}: {quizSubmitted.score} / {quizSubmitted.max}</p>
                      {quizSubmitted.feedback && <p className="p-4 rounded-xl bg-primary/10 border border-primary/20">{quizSubmitted.feedback}</p>}
                      {(quizSubmitted.results || []).map((r, i) => (
                        <div key={i} className={cn("p-4 rounded-xl border", r.correct ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5")}>
                          <p className="font-medium">{r.question}</p>
                          <p className="text-sm text-muted-foreground mt-1">{r.explanation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab === 'mindmap' && result && typeof result === 'object' && (
                    <div className="min-h-[420px] w-full rounded-xl border border-border bg-muted/20 p-2">
                      <MindMapDiagram data={result} className="min-h-[400px]" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

