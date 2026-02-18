import { useState, useRef, useEffect } from 'react';
import {
  Mic,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  History,
  Upload,
  Sparkles,
  Eraser,
  Save,
  Pause,
  Square,
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
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { hasArabic } from '@/lib/pdfArabic';
import { exportArabicPdf } from '@/lib/pdfArabicExport';
import { toast } from 'sonner';

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

/** Normalize segment and avoid glued words; add space for Arabic when needed */
function normalizeSegment(text, isArabic) {
  if (!text || !text.trim()) return '';
  const t = text.trim();
  return t;
}

/** Dedupe: avoid appending if new final is same as last (e.g. مرحبا then مرحبا → only one) */
function appendWithoutRepeat(committed, newPart, lastFinalRef, isArabic) {
  const part = normalizeSegment(newPart, isArabic);
  if (!part) return committed;
  if (lastFinalRef.current === part) return committed;
  lastFinalRef.current = part;
  const sep = committed ? (isArabic ? ' ' : ' ') : '';
  return committed + sep + part;
}

export default function VoiceToText() {
  const { api } = useAuth();
  const { language } = useLanguage();
  const [transcript, setTranscript] = useState('');
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const recognitionRef = useRef(null);
  const pdfUrlRef = useRef(null);
  const committedRef = useRef('');
  const lastFinalRef = useRef('');
  const fileInputRef = useRef(null);
  const pauseRequestedRef = useRef(false);
  const siriContainerRef = useRef(null);
  const siriInstanceRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;
  pdfUrlRef.current = pdfUrl;

  /* Siri-style classic wave, reactive to microphone level; responsive container */
  useEffect(() => {
    if (!isListening || !siriContainerRef.current) return;
    const container = siriContainerRef.current;
    let stream = null;
    let audioContext = null;
    let analyser = null;
    let instance = null;

    const cleanup = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      const inst = siriInstanceRef.current;
      if (inst && typeof inst.dispose === 'function') {
        try { inst.dispose(); } catch (_) {}
      }
      siriInstanceRef.current = null;
      const st = mediaStreamRef.current;
      if (st) st.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      const ctx = audioContextRef.current;
      if (ctx && ctx.state !== 'closed') ctx.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    };

    const init = async () => {
      let SiriWaveClass;
      try {
        const mod = await import('siriwave');
        SiriWaveClass = mod.default;
      } catch (e) {
        console.warn('SiriWave not available', e);
        return;
      }
      const rect = container.getBoundingClientRect();
      const w = Math.max(200, Math.floor(rect.width) || Math.min(400, window.innerWidth - 48));
      const h = Math.max(80, Math.floor(rect.height) || 120);

      try {
        instance = new SiriWaveClass({
          container,
          width: w,
          height: h,
          style: 'ios',
          curveDefinition: [
            { attenuation: -2, lineWidth: 1, opacity: 0.1 },
            { attenuation: -6, lineWidth: 1, opacity: 0.2 },
            { attenuation: 4, lineWidth: 1, opacity: 0.4 },
            { attenuation: 2, lineWidth: 1, opacity: 0.6 },
            { attenuation: 1, lineWidth: 1.5, opacity: 1 },
          ],
          speed: 0.08,
          amplitude: 0.35,
          frequency: 5,
          color: '#3b82f6',
          autostart: true,
        });
        siriInstanceRef.current = instance;
        const canvas = container.querySelector('canvas');
        if (canvas) {
          canvas.style.backgroundColor = 'transparent';
          canvas.style.background = 'transparent';
        }
      } catch (e) {
        console.warn('SiriWave init failed', e);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        const src = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        src.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let smoothed = 0.08;

        const update = () => {
          const inst = siriInstanceRef.current;
          const an = analyserRef.current;
          if (!inst) return;
          if (isPausedRef.current) {
            inst.setAmplitude(0);
            if (typeof inst.setSpeed === 'function') inst.setSpeed(0.03);
          } else if (an) {
            an.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            const avg = dataArray.length ? sum / dataArray.length / 255 : 0;
            smoothed = smoothed * 0.78 + avg * 0.22;
            const amp = avg < 0.012 ? 0 : Math.min(1.3, 0.06 + smoothed * 1.6);
            inst.setAmplitude(amp);
            if (typeof inst.setSpeed === 'function') {
              const speed = avg < 0.012 ? 0.04 : 0.06 + Math.min(0.12, smoothed * 0.28);
              inst.setSpeed(speed);
            }
          }
          rafRef.current = requestAnimationFrame(update);
        };
        rafRef.current = requestAnimationFrame(update);
      } catch (e) {
        console.warn('Microphone access failed', e);
      }
    };

    requestAnimationFrame(() => {
      if (!container.isConnected) return;
      init();
    });
    return cleanup;
  }, [isListening]);

  const isArabic = language === 'ar';

  const fetchHistory = () => {
    api.get('/voice/sessions').then((r) => setHistory(r.data || [])).catch(() => setHistory([]));
  };

  useEffect(() => {
    setIsSupported(!!SpeechRecognition);
    fetchHistory();
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
  }, [transcript, notes, summary]);

  const startListening = () => {
    if (!SpeechRecognition) return;
    committedRef.current = transcript;
    lastFinalRef.current = '';
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = isArabic ? 'ar-SA' : 'en-US';

    recognition.onresult = (event) => {
      const finalParts = [];
      let interimPart = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = (result[0] && result[0].transcript) ? result[0].transcript.trim() : '';
        if (!text) continue;
        if (result.isFinal) {
          committedRef.current = appendWithoutRepeat(
            committedRef.current,
            text,
            lastFinalRef,
            isArabic
          );
          finalParts.push(text);
        } else {
          interimPart += (interimPart ? ' ' : '') + text;
        }
      }
      const interim = interimPart.trim();
      setTranscript(committedRef.current + (interim ? ' ' + interim : ''));
    };

    recognition.onerror = (e) => {
      if (e.error !== 'aborted') {
        toast.error(isArabic ? 'خطأ في التعرف على الصوت' : 'Speech recognition error');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (pauseRequestedRef.current) {
        pauseRequestedRef.current = false;
        setIsPaused(true);
        return;
      }
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setIsPaused(false);
    toast.success(isArabic ? 'جاري الاستماع...' : 'Listening...');
  };

  const pauseListening = () => {
    if (!recognitionRef.current) return;
    pauseRequestedRef.current = true;
    recognitionRef.current.stop();
    recognitionRef.current = null;
    setTranscript((prev) => {
      committedRef.current = prev;
      return prev;
    });
    toast.info(isArabic ? 'إيقاف مؤقت' : 'Paused');
  };

  const resumeListening = () => {
    if (!SpeechRecognition) return;
    setIsPaused(false);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = isArabic ? 'ar-SA' : 'en-US';
    recognition.onresult = (event) => {
      let interimPart = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = (result[0] && result[0].transcript) ? result[0].transcript.trim() : '';
        if (!text) continue;
        if (result.isFinal) {
          committedRef.current = appendWithoutRepeat(committedRef.current, text, lastFinalRef, isArabic);
        } else {
          interimPart += (interimPart ? ' ' : '') + text;
        }
      }
      const interim = interimPart.trim();
      setTranscript(committedRef.current + (interim ? ' ' + interim : ''));
    };
    recognition.onerror = (e) => {
      if (e.error !== 'aborted') toast.error(isArabic ? 'خطأ في التعرف على الصوت' : 'Speech recognition error');
      setIsListening(false);
    };
    recognition.onend = () => {
      if (pauseRequestedRef.current) {
        pauseRequestedRef.current = false;
        setIsPaused(true);
        return;
      }
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    toast.success(isArabic ? 'استئناف التسجيل' : 'Resumed');
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    pauseRequestedRef.current = false;
    setTranscript((prev) => {
      committedRef.current = prev;
      return prev;
    });
    setIsListening(false);
    setIsPaused(false);
    toast.success(isArabic ? 'تم إنهاء التسجيل' : 'Recording ended');
  };

  const handleCleanWithAI = async () => {
    if (!transcript.trim()) {
      toast.error(isArabic ? 'أدخل نصاً أولاً' : 'Enter text first');
      return;
    }
    setIsCleaning(true);
    try {
      const r = await api.post('/voice/clean', { text: transcript, lang: isArabic ? 'ar' : 'en' });
      setTranscript(r.data.cleaned || transcript);
      toast.success(isArabic ? 'تم تنظيم النص وإزالة التشويش' : 'Transcript cleaned');
    } catch (err) {
      toast.error(err.response?.data?.detail || (isArabic ? 'فشل التنظيف' : 'Clean failed'));
    } finally {
      setIsCleaning(false);
    }
  };

  const handleSummarize = async () => {
    const text = transcript.trim();
    if (!text) {
      toast.error(isArabic ? 'أدخل نصاً أولاً أو سجّل صوتاً' : 'Enter text or record first');
      return;
    }
    setIsSummarizing(true);
    try {
      const r = await api.post('/voice/summarize', { text, lang: isArabic ? 'ar' : 'en' });
      setSummary(r.data.summary || '');
      toast.success(isArabic ? 'تم إنشاء الملخص' : 'Summary generated');
    } catch (err) {
      toast.error(err.response?.data?.detail || (isArabic ? 'فشل التلخيص' : 'Summarize failed'));
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSaveSession = async () => {
    const title = (transcript || notes || '').slice(0, 80) || (isArabic ? 'تسجيل صوتي' : 'Voice session');
    try {
      if (selectedSessionId) {
        await api.patch(`/voice/sessions/${selectedSessionId}`, {
          title,
          transcript,
          notes,
          summary: summary || null,
        });
        toast.success(isArabic ? 'تم تحديث الجلسة' : 'Session updated');
      } else {
        await api.post('/voice/sessions', {
          title,
          transcript,
          notes,
          summary: summary || null,
          source: 'live',
          lang: isArabic ? 'ar' : 'en',
        });
        toast.success(isArabic ? 'تم حفظ الجلسة' : 'Session saved');
      }
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.detail || (isArabic ? 'فشل الحفظ' : 'Save failed'));
    }
  };

  const loadSession = (session) => {
    setSelectedSessionId(session.id);
    setTranscript(session.transcript || '');
    setNotes(session.notes || '');
    setSummary(session.summary || '');
  };

  const clearCurrent = () => {
    setSelectedSessionId(null);
    setTranscript('');
    setNotes('');
    setSummary('');
  };

  const generatePdf = async () => {
    const contentStr = [transcript, notes, summary].filter(Boolean).join('\n');
    if (!contentStr.trim()) {
      toast.error(isArabic ? 'أدخل نصاً أو ملاحظات أولاً' : 'Enter text or notes first');
      return;
    }
    try {
      const useArabic = isArabic || hasArabic(contentStr);
      if (useArabic) {
        toast.info(isArabic ? 'جاري إنشاء PDF بالعربية...' : 'Creating Arabic PDF...');
        const doc = await exportArabicPdf(
          'voice',
          { transcript, notes, summary },
          language
        );
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        setPdfUrl(url);
        toast.success(isArabic ? 'تم إنشاء ملف PDF' : 'PDF generated');
      } else {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const maxWidth = pageWidth - margin * 2;
        let y = margin;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        if (transcript) {
          doc.setFontSize(12);
          doc.text('Transcribed Text', margin, y); y += 8;
          const lines = doc.splitTextToSize(transcript, maxWidth);
          lines.forEach((line) => { doc.text(line, margin, y); y += 6; });
          y += 6;
        }
        if (notes) {
          doc.setFontSize(12);
          doc.text('Notes', margin, y); y += 8;
          const lines = doc.splitTextToSize(notes, maxWidth);
          lines.forEach((line) => { doc.text(line, margin, y); y += 6; });
          y += 6;
        }
        if (summary) {
          doc.setFontSize(12);
          doc.text('Summary', margin, y); y += 8;
          const lines = doc.splitTextToSize(summary, maxWidth);
          lines.forEach((line) => { doc.text(line, margin, y); y += 6; });
        }
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        setPdfUrl(url);
        toast.success('PDF generated');
      }
    } catch (err) {
      console.error(err);
      toast.error(isArabic ? 'فشل إنشاء PDF' : 'Failed to generate PDF');
    }
  };

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `voice-transcript-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
  };

  const handleUploadAudio = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/webm'];
    if (!allowed.includes(file.type) && !/\.(mp3|wav|m4a|webm)$/i.test(file.name)) {
      toast.error(isArabic ? 'الملف يجب أن يكون صوتياً (mp3, wav, m4a)' : 'File must be audio (mp3, wav, m4a)');
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const b64 = typeof dataUrl === 'string' && dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
      if (!b64) {
        setIsUploading(false);
        return;
      }
      api.post('/voice/upload-audio', {
        file_base64: b64,
        filename: file.name,
        lang: isArabic ? 'ar' : 'en',
        summarize: true,
      })
        .then((r) => {
          setTranscript(r.data.transcript || '');
          if (r.data.summary) setSummary(r.data.summary);
          toast.success(isArabic ? 'تم تحويل الصوت إلى نص' : 'Audio transcribed');
        })
        .catch((err) => {
          const msg = err.response?.data?.detail || (isArabic ? 'فشل رفع الملف' : 'Upload failed');
          toast.error(msg);
        })
        .finally(() => setIsUploading(false));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 pb-12" data-testid="voice-to-text-page">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Mic className="w-5 h-5" />
          </div>
          {isArabic ? 'الصوت إلى نص' : 'Voice to Text'}
        </h2>
        <p className="text-muted-foreground mt-1">
          {isArabic
            ? 'سجّل صوتك أو ارفع ملفاً صوتياً، حوّله إلى نص واضح، اكتب ملاحظات أثناء التسجيل، وصدّر PDF مدعوم بالعربية'
            : 'Record or upload audio, convert to clear text, take notes while recording, and export formatted PDF with Arabic support'}
        </p>
      </div>

      {/* Recording UI inline – title/description stay visible, inherits page background */}
      {isListening && (
        <div className="rounded-2xl border border-border/50 overflow-hidden">
          <div
            ref={siriContainerRef}
            className="w-full h-16 sm:h-20 shrink-0 overflow-hidden"
            aria-hidden
          />
          <div className="flex flex-col px-4 sm:px-6 py-5 gap-4">
            <p className="text-sm text-muted-foreground text-center">
              {isPaused
                ? (isArabic ? 'التسجيل متوقف مؤقتاً. اضغط استئناف للمتابعة.' : 'Recording paused. Press Resume to continue.')
                : (isArabic ? 'جاري التسجيل... اكتب ملاحظاتك أدناه.' : 'Recording... Type your notes below.')}
            </p>
            <div className="w-full space-y-2">
              <label className="text-sm font-medium text-foreground">
                {isArabic ? 'كتابة ملاحظات أثناء التسجيل' : 'Notes during recording'}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isArabic ? 'اكتب ملاحظاتك هنا...' : 'Type your notes here...'}
                className="min-h-[120px] sm:min-h-[140px] rounded-xl resize-none w-full"
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 w-full pt-1">
              {isPaused ? (
                <Button size="lg" onClick={resumeListening} className="rounded-xl">
                  <Mic className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                  {isArabic ? 'استئناف' : 'Resume'}
                </Button>
              ) : (
                <Button size="lg" variant="outline" onClick={pauseListening} className="rounded-xl">
                  <Pause className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                  {isArabic ? 'إيقاف مؤقت' : 'Pause'}
                </Button>
              )}
              <Button size="lg" variant="destructive" onClick={stopListening} className="rounded-xl">
                <Square className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                {isArabic ? 'إنهاء التسجيل' : 'Stop recording'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!isSupported && (
        <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-foreground">
              {isArabic
                ? 'التعرف على الصوت غير مدعوم في هذا المتصفح. جرّب Chrome أو Edge.'
                : 'Speech recognition is not supported in this browser. Try Chrome or Edge.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tips: capture, dialect, speed, noise, volume */}
      <Card className="rounded-2xl border border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Mic className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              {isArabic ? 'تحسين التقاط الصوت والفهم' : 'Better voice capture and understanding'}
            </p>
            <p className="text-muted-foreground mt-1">
              {isArabic
                ? 'يدعم اللهجات العامية (مصرية، شامية، خليجية…) وسرعات مختلفة (بطيء/سريع). التقاط أوضح للأصوات العالية والمنخفضة مع تقليل التشويش والضوضاء. قرّب الميكروفون أو ارفع الصوت للصوت البعيد؛ استخدم "تنظيف النص" لتحسين النتيجة.'
                : 'Supports colloquial speech and accents, and different speeds (slow/fast). Better capture of loud and quiet sounds with reduced noise. Move the mic closer or increase volume for distant audio; use "Clean with AI" to refine the result.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main: recording + transcript + notes + actions */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="rounded-2xl sm:rounded-[2rem] border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b bg-muted/20 px-6 py-6">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Mic className="w-5 h-5 text-primary" />
                {isArabic ? 'إدخال الصوت' : 'Voice Input'}
              </CardTitle>
              <CardDescription>
                {isArabic
                  ? 'تسجيل مباشر أو رفع ملف صوتي. النص يظهر دون تكرار كلمات.'
                  : 'Live recording or upload an audio file. Text appears without word repetition.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="lg"
                  onClick={startListening}
                  disabled={!isSupported || isListening}
                >
                  <Mic className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                  {isArabic ? 'بدء التسجيل' : 'Start Recording'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.webm"
                  className="hidden"
                  onChange={handleUploadAudio}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                  )}
                  {isArabic ? 'رفع ملف صوتي' : 'Upload audio'}
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isArabic ? 'النص المُحوّل' : 'Transcribed Text'}
                </label>
                <Textarea
                  placeholder={isArabic ? 'سيظهر النص هنا بعد التسجيل أو الرفع...' : 'Text appears here after recording or upload...'}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="min-h-[180px] rounded-xl resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isArabic ? 'ملاحظات أثناء التسجيل' : 'Notes during recording'}
                </label>
                <Textarea
                  placeholder={isArabic ? 'اكتب ملاحظاتك هنا أثناء أو بعد التسجيل...' : 'Type notes here during or after recording...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px] rounded-xl resize-none"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCleanWithAI}
                  disabled={!transcript.trim() || isCleaning}
                >
                  {isCleaning ? <Loader2 className="w-4 h-4 animate-spin mr-1 rtl:ml-1 rtl:mr-0" /> : <Eraser className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />}
                  {isArabic ? 'تنظيف النص (ذكاء صنعي)' : 'Clean with AI'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSummarize}
                  disabled={!transcript.trim() || isSummarizing}
                >
                  {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin mr-1 rtl:ml-1 rtl:mr-0" /> : <Sparkles className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />}
                  {isArabic ? 'تلخيص' : 'Summarize'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSaveSession}>
                  <Save className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
                  {isArabic ? 'حفظ الجلسة' : 'Save session'}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={generatePdf}
                  disabled={!transcript.trim() && !notes.trim() && !summary.trim()}
                >
                  <FileText className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  {isArabic ? 'إنشاء PDF' : 'Generate PDF'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {summary && (
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="py-4">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {isArabic ? 'الملخص' : 'Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-foreground whitespace-pre-wrap">{summary}</p>
              </CardContent>
            </Card>
          )}

          {/* PDF preview / download */}
          <Card className="rounded-2xl sm:rounded-[2rem] border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b bg-muted/20 px-6 py-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {isArabic ? 'نتيجة التحويل (PDF)' : 'Result (PDF)'}
                </CardTitle>
                <CardDescription>
                  {isArabic ? 'معاينة وتحميل ملف PDF منسق (مدعوم بالعربية)' : 'Preview and download formatted PDF (Arabic supported)'}
                </CardDescription>
              </div>
              {pdfUrl && (
                <Button size="sm" variant="secondary" className="rounded-xl shrink-0" onClick={downloadPdf}>
                  <Download className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
                  {isArabic ? 'تحميل' : 'Download'}
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6 min-h-[280px] flex flex-col">
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  title="PDF preview"
                  className="w-full flex-1 min-h-[360px] rounded-xl border bg-muted/20"
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                  <FileText className="w-14 h-14 mb-4 opacity-40" />
                  <p className="font-medium">
                    {isArabic ? 'لم يتم إنشاء PDF بعد' : 'No PDF generated yet'}
                  </p>
                  <p className="text-sm mt-1">
                    {isArabic ? 'سجّل أو اكتب النص ثم اضغط "إنشاء PDF"' : 'Record or type text, then click "Generate PDF"'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <Card className="rounded-2xl border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b bg-muted/20 px-6 py-6">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              {isArabic ? 'السجل' : 'History'}
            </CardTitle>
            <CardDescription>
              {isArabic ? 'ارجع إلى أي جلسة سابقة' : 'Return to any previous session'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <Button variant="ghost" size="sm" className="w-full justify-start mb-2" onClick={clearCurrent}>
              {isArabic ? '+ جلسة جديدة' : '+ New session'}
            </Button>
            <div className="space-y-1 max-h-[420px] overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {isArabic ? 'لا توجد جلسات بعد' : 'No sessions yet'}
                </p>
              ) : (
                history.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => loadSession(session)}
                    className={`w-full text-right rounded-xl p-3 text-sm transition-colors block border ${
                      selectedSessionId === session.id
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-muted/30 border-transparent hover:bg-muted/50'
                    }`}
                  >
                    <span className="font-medium line-clamp-1">
                      {session.title || (isArabic ? 'تسجيل صوتي' : 'Voice session')}
                    </span>
                    <span className="text-xs text-muted-foreground block mt-1">
                      {session.created_at ? new Date(session.created_at).toLocaleString(isArabic ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
