import { useState, useEffect } from 'react';
import { StickyNote, Bot, Plus, Pencil, Trash2, Loader2, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { toast } from 'sonner';

export default function Notes() {
  const { api } = useAuth();
  const { language } = useLanguage();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formContent, setFormContent] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [courses, setCourses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [improving, setImproving] = useState(false);

  useEffect(() => {
    fetchNotes();
    fetchCourses();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await api.get('/notes');
      setNotes(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      toast.error(language === 'ar' ? 'فشل تحميل الملاحظات' : 'Failed to load notes');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await api.get('/student/courses');
      setCourses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCourses([]);
    }
  };

  const handleSaveStudentNote = async (e) => {
    e.preventDefault();
    if (!formContent.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/notes/${editingId}`, { content: formContent.trim() });
        toast.success(language === 'ar' ? 'تم تحديث الملاحظة' : 'Note updated');
      } else {
        await api.post('/notes', {
          content: formContent.trim(),
          student_course_id: formCourseId || null,
        });
        toast.success(language === 'ar' ? 'تم إضافة الملاحظة' : 'Note added');
      }
      setStudentDialogOpen(false);
      setEditingId(null);
      setFormContent('');
      setFormCourseId('');
      fetchNotes();
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'ar' ? 'فشل الحفظ' : 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (id) => {
    try {
      await api.delete(`/notes/${id}`);
      toast.success(language === 'ar' ? 'تم حذف الملاحظة' : 'Note deleted');
      fetchNotes();
    } catch {
      toast.error(language === 'ar' ? 'فشل الحذف' : 'Failed to delete');
    }
  };

  const openEdit = (note) => {
    if (note.type !== 'student') return;
    setEditingId(note.id);
    setFormContent(note.content);
    setFormCourseId(note.student_course_id ?? '');
    setStudentDialogOpen(true);
  };

  const handleImproveWithAI = async () => {
    if (!formContent.trim()) return;
    setImproving(true);
    try {
      const res = await api.post('/notes/improve', {
        content: formContent.trim(),
        lang: language === 'ar' ? 'ar' : 'en',
      });
      if (res.data?.improved) setFormContent(res.data.improved);
      toast.success(language === 'ar' ? 'تم اقتراح تحسين النص' : 'Improved text suggested');
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'ar' ? 'فشل التحسين' : 'Improve failed'));
    } finally {
      setImproving(false);
    }
  };

  const studentNotes = notes.filter((n) => n.type === 'student');
  const examInsightNotes = notes.filter((n) => n.type === 'app' && n.note_category === 'exam_insight');
  const appNotes = notes.filter((n) => n.type === 'app' && n.note_category !== 'exam_insight');

  if (loading) {
    return (
      <div className="space-y-8 pb-12">
        <div className="h-10 w-64 bg-muted rounded-2xl animate-pulse" />
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-[2rem] animate-pulse h-64" />
          <Card className="rounded-[2rem] animate-pulse h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12" data-testid="notes-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-display tracking-tight text-foreground">
            {language === 'ar' ? 'الملاحظات' : 'Notes'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'ملاحظاتك الشخصية، وتحليل أداء الامتحانات داخل التطبيق، وتوصيات بناءً على علاماتك' : 'Your notes, exam performance analysis from in-app quizzes, and grade-based recommendations'}
          </p>
        </div>
        <Button
          className="rounded-xl"
          onClick={() => {
            setEditingId(null);
            setFormContent('');
            setFormCourseId('');
            setStudentDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
          {language === 'ar' ? 'إضافة ملاحظة' : 'Add note'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Student notes */}
        <Card className="rounded-[2rem] border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="px-6 sm:px-8 pt-8 pb-4 border-b bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <StickyNote className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-display">
                  {language === 'ar' ? 'ملاحظات الطالب' : 'Student notes'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'ملاحظاتك التي تدونها بنفسك' : 'Notes you write yourself'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 sm:px-8 py-6">
            {studentNotes.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد ملاحظات بعد. أضف ملاحظة جديدة.' : 'No notes yet. Add a new note.'}</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {studentNotes.map((note) => (
                  <li key={note.id}>
                    <Card className="rounded-2xl border bg-background/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {note.course_name && (
                              <Badge variant="secondary" className="rounded-full text-xs mb-2">
                                {note.course_name}
                              </Badge>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(note.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => openEdit(note)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteNote(note.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* App notes — recommendations and messages when grades are low */}
        <Card className="rounded-[2rem] border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="px-6 sm:px-8 pt-8 pb-4 border-b bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-display">
                  {language === 'ar' ? 'ملاحظات التطبيق' : 'App notes'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar'
                    ? 'توصيات ورسائل تلقائية عند انخفاض العلامات أو حاجة مادة لتركيز أكبر'
                    : 'Recommendations and messages when your grades drop or a course needs more focus'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 sm:px-8 py-6">
            {appNotes.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">{language === 'ar' ? 'لا توجد توصيات بعد' : 'No recommendations yet'}</p>
                <p className="text-sm mt-1">{language === 'ar' ? 'أدخل علاماتك في صفحات المواد. عند انخفاض علامة مادة ستظهر هنا توصيات ورسائل لمساعدتك.' : 'Enter your grades in course pages. When a grade is low, recommendations will appear here.'}</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {appNotes.map((note) => (
                  <li key={note.id}>
                    <Card className="rounded-2xl border bg-secondary/5 border-secondary/20">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2">
                          <Bot className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <Badge variant="secondary" className="rounded-full text-xs mb-2">
                              {note.course_name || (language === 'ar' ? 'توصية عامة' : 'General recommendation')}
                            </Badge>
                            <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(note.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Exam performance — from Study Tools quizzes */}
      <Card className="rounded-[2rem] border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="px-6 sm:px-8 pt-8 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-display">
                {language === 'ar' ? 'تحليل أداء الامتحانات' : 'Exam performance analysis'}
              </CardTitle>
              <CardDescription>
                {language === 'ar'
                  ? 'تحليل كامل بناءً على الاختبارات التي قدمتها في أدوات الدراسة: نقاط القوة، نقاط الضعف، ومواضيع للتركيز. نستخدمه للجدولة الذكية.'
                  : 'Full analysis from quizzes you took in Study Tools: strengths, weaknesses, and topics to focus on. Used for smart scheduling.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 sm:px-8 py-6">
          {examInsightNotes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">{language === 'ar' ? 'لا يوجد تحليل بعد' : 'No analysis yet'}</p>
              <p className="text-sm mt-1">
                {language === 'ar'
                  ? 'قدّم اختبارات من أدوات الدراسة (ملخص أو محاضرة ثم اختبار). بعد كل اختبار نضيف هنا تحليلاً تلقائياً: نقاط القوة، نقاط الضعف، ومواضيع للمراجعة مع جدولة مقترحة.'
                  : 'Take quizzes from Study Tools (from a summary or lecture). After each attempt we add an automatic analysis here: strengths, weaknesses, and topics to review with suggested scheduling.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-6">
              {examInsightNotes.map((note) => (
                <li key={note.id}>
                  <Card className="rounded-2xl border bg-amber-500/5 border-amber-500/20 dark:bg-amber-500/10 dark:border-amber-500/20">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-2">
                        <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          {note.quiz_title && (
                            <Badge variant="secondary" className="rounded-full text-xs mb-2 bg-amber-500/20 text-amber-800 dark:text-amber-200">
                              {language === 'ar' ? 'من اختبار: ' : 'From quiz: '}{note.quiz_title}
                            </Badge>
                          )}
                          <div className="text-sm whitespace-pre-wrap break-words prose prose-sm dark:prose-invert max-w-none">{note.content}</div>
                          <p className="text-xs text-muted-foreground mt-3">
                            {new Date(note.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? (language === 'ar' ? 'تعديل الملاحظة' : 'Edit note') : (language === 'ar' ? 'إضافة ملاحظة' : 'Add note')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveStudentNote} className="space-y-4 mt-4">
            {!editingId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'المادة (اختياري)' : 'Course (optional)'}</label>
                <select
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  value={formCourseId}
                  onChange={(e) => setFormCourseId(e.target.value)}
                >
                  <option value="">—</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.course_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{language === 'ar' ? 'المحتوى' : 'Content'}</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs gap-1"
                  disabled={!formContent.trim() || improving}
                  onClick={handleImproveWithAI}
                >
                  {improving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                  {language === 'ar' ? 'تحسين بالذكاء الاصطناعي' : 'Improve with AI'}
                </Button>
              </div>
              <Textarea
                className="min-h-[120px] rounded-xl resize-none"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                required
                placeholder={language === 'ar' ? 'اكتب ملاحظتك هنا...' : 'Write your note here...'}
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setStudentDialogOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" className="flex-1 rounded-xl" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
