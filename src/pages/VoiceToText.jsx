import { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  FileText,
  Download,
  Loader2,
  AlertCircle,
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
import { useLanguage } from '@/lib/LanguageContext';
import { toast } from 'sonner';

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

/** Normalize and add spacing/punctuation hints to avoid glued words */
function normalizeSegment(text, isArabic) {
  if (!text || !text.trim()) return '';
  const t = text.trim();
  if (isArabic) {
    return t;
  }
  return t;
}

export default function VoiceToText() {
  const { language } = useLanguage();
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const recognitionRef = useRef(null);
  const pdfUrlRef = useRef(null);
  const committedRef = useRef('');
  pdfUrlRef.current = pdfUrl;

  useEffect(() => {
    setIsSupported(!!SpeechRecognition);
    return () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  useEffect(() => {
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [transcript]);

  const startListening = () => {
    if (!SpeechRecognition) return;
    committedRef.current = transcript;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US';

    recognition.onresult = (event) => {
      const isArabic = language === 'ar';
      const finalParts = [];
      let interimPart = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = (result[0] && result[0].transcript) ? result[0].transcript.trim() : '';
        if (!text) continue;
        if (result.isFinal) {
          finalParts.push(normalizeSegment(text, isArabic));
        } else {
          interimPart += (interimPart ? ' ' : '') + text;
        }
      }
      if (finalParts.length > 0) {
        const toAppend = finalParts.join(isArabic ? ' ' : ' ');
        committedRef.current += (committedRef.current ? ' ' : '') + toAppend;
      }
      const interim = interimPart.trim();
      setTranscript(committedRef.current + (interim ? ' ' + interim : ''));
    };

    recognition.onerror = (e) => {
      if (e.error !== 'aborted') {
        toast.error(
          language === 'ar' ? 'خطأ في التعرف على الصوت' : 'Speech recognition error'
        );
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    toast.success(
      language === 'ar' ? 'جاري الاستماع...' : 'Listening...'
    );
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setTranscript((prev) => {
      committedRef.current = prev;
      return prev;
    });
    setIsListening(false);
  };

  const generatePdf = async () => {
    if (!transcript.trim()) {
      toast.error(
        language === 'ar' ? 'أدخل نصاً أولاً أو سجّل صوتاً' : 'Enter text or record voice first'
      );
      return;
    }
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - margin * 2;
      const lineHeight = 7;
      let y = margin;
      const fontSize = 11;

      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'normal');

      const lines = doc.splitTextToSize(transcript, maxWidth);
      for (const line of lines) {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      setPdfUrl(url);
      toast.success(
        language === 'ar' ? 'تم إنشاء ملف PDF' : 'PDF generated'
      );
    } catch (err) {
      console.error(err);
      toast.error(
        language === 'ar' ? 'فشل إنشاء PDF' : 'Failed to generate PDF'
      );
    }
  };

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `transcript-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
  };

  return (
    <div className="space-y-6 pb-12" data-testid="voice-to-text-page">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Mic className="w-5 h-5" />
          </div>
          {language === 'ar' ? 'الصوت إلى نص' : 'Voice to Text'}
        </h2>
        <p className="text-muted-foreground mt-1">
          {language === 'ar'
            ? 'سجّل صوتك وحوّله إلى نص ثم حمّل النتيجة كملف PDF'
            : 'Record your voice, convert to text, and export as PDF'}
        </p>
      </div>

      {!isSupported && (
        <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-foreground">
              {language === 'ar'
                ? 'التعرف على الصوت غير مدعوم في هذا المتصفح. جرّب Chrome أو Edge.'
                : 'Speech recognition is not supported in this browser. Try Chrome or Edge.'}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl sm:rounded-[2rem] border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b bg-muted/20 px-6 py-6">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Mic className="w-5 h-5 text-primary" />
              {language === 'ar' ? 'إدخال الصوت' : 'Voice Input'}
            </CardTitle>
            <CardDescription>
              {language === 'ar'
                ? 'اضغط للتسجيل وإيقاف التسجيل. النص يظهر أدناه.'
                : 'Press to start and stop recording. Text appears below.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-center">
              <Button
                size="lg"
                className={isListening ? 'bg-destructive hover:bg-destructive/90' : ''}
                onClick={isListening ? stopListening : startListening}
                disabled={!isSupported}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                    {language === 'ar' ? 'إيقاف التسجيل' : 'Stop'}
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                    {language === 'ar' ? 'بدء التسجيل' : 'Start Recording'}
                  </>
                )}
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {language === 'ar' ? 'النص المُحوّل' : 'Transcribed Text'}
              </label>
              <Textarea
                placeholder={
                  language === 'ar'
                    ? 'سيظهر النص هنا بعد التسجيل أو اكتب مباشرة...'
                    : 'Text will appear here after recording or type here...'
                }
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="min-h-[200px] rounded-xl resize-none"
              />
            </div>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={generatePdf}
              disabled={!transcript.trim()}
            >
              <FileText className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'ar' ? 'إنشاء PDF' : 'Generate PDF'}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl sm:rounded-[2rem] border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b bg-muted/20 px-6 py-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {language === 'ar' ? 'نتيجة التحويل (PDF)' : 'Result (PDF)'}
              </CardTitle>
              <CardDescription>
                {language === 'ar'
                  ? 'معاينة وتحميل ملف PDF'
                  : 'Preview and download the PDF'}
              </CardDescription>
            </div>
            {pdfUrl && (
              <Button
                size="sm"
                variant="secondary"
                className="rounded-xl shrink-0"
                onClick={downloadPdf}
              >
                <Download className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
                {language === 'ar' ? 'تحميل' : 'Download'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-6 min-h-[320px] flex flex-col">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                title="PDF preview"
                className="w-full flex-1 min-h-[400px] rounded-xl border bg-muted/20"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                <FileText className="w-14 h-14 mb-4 opacity-40" />
                <p className="font-medium">
                  {language === 'ar'
                    ? 'لم يتم إنشاء PDF بعد'
                    : 'No PDF generated yet'}
                </p>
                <p className="text-sm mt-1">
                  {language === 'ar'
                    ? 'سجّل أو اكتب النص ثم اضغط "إنشاء PDF"'
                    : 'Record or type text, then click "Generate PDF"'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
