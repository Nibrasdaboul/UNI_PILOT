import { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  GraduationCap,
  Sparkles,
  Target,
  CheckCircle2,
  Trash2,
  Pencil,
  MessageSquare,
  GitCompare,
  Loader2,
  Search,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Planner() {
  const { api } = useAuth();
  const { t, language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [daily, setDaily] = useState({ events: [], tasks: [] });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [feedbackData, setFeedbackData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [formEvent, setFormEvent] = useState({
    title: '',
    student_course_id: 'none',
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '11:00',
    event_type: 'study',
    description: '',
  });
  const [formTask, setFormTask] = useState({
    title: '',
    student_course_id: 'none',
    due_date: '',
    due_time: '',
    priority: 3,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');

  const dateStr = selectedDate.toISOString().slice(0, 10);
  const searchLower = searchQuery.trim().toLowerCase();
  const filteredEvents = daily.events
    .filter((ev) => !searchLower || (ev.title || '').toLowerCase().includes(searchLower))
    .filter((ev) => courseFilter === 'all' || String(ev.student_course_id ?? 'general') === courseFilter)
    .filter((ev) => eventTypeFilter === 'all' || ev.event_type === eventTypeFilter);
  const filteredTasks = daily.tasks
    .filter((t) => !searchLower || (t.title || '').toLowerCase().includes(searchLower))
    .filter((t) => courseFilter === 'all' || String(t.student_course_id ?? 'general') === courseFilter);

  useEffect(() => {
    fetchDaily();
    fetchCourses();
  }, [dateStr]);

  const fetchDaily = async () => {
    try {
      const res = await api.get(`/planner/daily?date=${dateStr}`);
      setDaily({ events: res.data.events || [], tasks: res.data.tasks || [] });
    } catch (e) {
      console.error(e);
      setDaily({ events: [], tasks: [] });
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

  const resetEventForm = () => {
    setEditingEvent(null);
    setFormEvent({
      title: '',
      student_course_id: 'none',
      start_date: dateStr,
      end_date: dateStr,
      start_time: '09:00',
      end_time: '11:00',
      event_type: 'study',
      description: '',
    });
  };

  const resetTaskForm = () => {
    setEditingTask(null);
    setFormTask({
      title: '',
      student_course_id: 'none',
      due_date: dateStr,
      due_time: '',
      priority: 3,
    });
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await api.patch(`/planner/events/${editingEvent.id}`, {
          ...formEvent,
          student_course_id: (formEvent.student_course_id === 'none' || !formEvent.student_course_id) ? null : formEvent.student_course_id,
        });
        toast.success(language === 'ar' ? 'تم تحديث الحدث' : 'Event updated');
      } else {
        await api.post('/planner/events', {
          ...formEvent,
          student_course_id: (formEvent.student_course_id === 'none' || !formEvent.student_course_id) ? null : formEvent.student_course_id,
          start_date: formEvent.start_date || dateStr,
          end_date: formEvent.end_date || formEvent.start_date || dateStr,
        });
        toast.success(language === 'ar' ? 'تمت إضافة الحدث' : 'Event added');
      }
      setEventDialogOpen(false);
      resetEventForm();
      fetchDaily();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('common.error'));
    }
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await api.patch(`/planner/tasks/${editingTask.id}`, {
          ...formTask,
          student_course_id: (formTask.student_course_id === 'none' || !formTask.student_course_id) ? null : formTask.student_course_id,
        });
        toast.success(language === 'ar' ? 'تم تحديث المهمة' : 'Task updated');
      } else {
        await api.post('/planner/tasks', {
          ...formTask,
          student_course_id: (formTask.student_course_id === 'none' || !formTask.student_course_id) ? null : formTask.student_course_id,
          due_date: formTask.due_date || dateStr,
          source: 'student',
        });
        toast.success(language === 'ar' ? 'تمت إضافة المهمة' : 'Task added');
      }
      setTaskDialogOpen(false);
      resetTaskForm();
      fetchDaily();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('common.error'));
    }
  };

  const handleToggleTask = async (task) => {
    try {
      await api.patch(`/planner/tasks/${task.id}`, { completed: !task.completed });
      const wasIncomplete = !task.completed;
      await fetchDaily();
      if (wasIncomplete) {
        try {
          await api.post('/planner/suggest-next', { date: dateStr, lang: language === 'ar' ? 'ar' : 'en' });
          await fetchDaily();
        } catch (_) { /* optional: no new suggestion */ }
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleDeleteEvent = async (id) => {
    const idNum = Number(id);
    const previous = daily;
    setDaily((d) => ({ ...d, events: (d.events || []).filter((e) => Number(e.id) !== idNum) }));
    try {
      await api.delete(`/planner/events/${idNum}`);
      toast.success(language === 'ar' ? 'تم حذف الحدث' : 'Event deleted');
    } catch (err) {
      setDaily(previous);
      const msg = err?.response?.data?.detail || t('common.error');
      toast.error(typeof msg === 'string' ? msg : t('common.error'));
    }
  };

  const handleDeleteTask = async (id) => {
    const idNum = Number(id);
    const previous = daily;
    setDaily((d) => ({ ...d, tasks: (d.tasks || []).filter((t) => Number(t.id) !== idNum) }));
    if (editingTask && Number(editingTask.id) === idNum) {
      setTaskDialogOpen(false);
      setEditingTask(null);
    }
    try {
      await api.delete(`/planner/tasks/${idNum}`);
      toast.success(language === 'ar' ? 'تم حذف المهمة' : 'Task deleted');
    } catch (err) {
      setDaily(previous);
      const msg = err?.response?.data?.detail || t('common.error');
      toast.error(typeof msg === 'string' ? msg : t('common.error'));
    }
  };

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      await api.post('/planner/generate-plan', { from_date: dateStr, to_date: dateStr, lang: language === 'ar' ? 'ar' : 'en' });
      toast.success(language === 'ar' ? 'تم إنشاء مخطط مقترح حسب أولوية المواد' : 'Smart plan generated by course priority');
      fetchDaily();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('common.error'));
    } finally {
      setGenerating(false);
    }
  };

  const openCompare = async () => {
    setCompareOpen(true);
    try {
      const lang = language === 'ar' ? 'ar' : 'en';
      const res = await api.get(`/planner/compare?date=${dateStr}&lang=${lang}`);
      setCompareData(res.data);
    } catch {
      setCompareData(null);
    }
  };

  const openFeedback = async () => {
    setFeedbackOpen(true);
    try {
      const lang = language === 'ar' ? 'ar' : 'en';
      const res = await api.get(`/planner/feedback?date=${dateStr}&lang=${lang}`);
      setFeedbackData(res.data);
    } catch {
      setFeedbackData(null);
    }
  };

  const openEditEvent = (ev) => {
    setEditingEvent(ev);
    setFormEvent({
      title: ev.title,
      student_course_id: (ev.student_course_id != null && ev.student_course_id !== '') ? String(ev.student_course_id) : 'none',
      start_date: ev.start_date,
      end_date: ev.end_date,
      start_time: ev.start_time?.slice(0, 5) || '09:00',
      end_time: ev.end_time?.slice(0, 5) || '11:00',
      event_type: ev.event_type || 'study',
      description: ev.description || '',
    });
    setEventDialogOpen(true);
  };

  const openEditTask = (tk) => {
    setEditingTask(tk);
    setFormTask({
      title: tk.title,
      student_course_id: (tk.student_course_id != null && tk.student_course_id !== '') ? String(tk.student_course_id) : 'none',
      due_date: tk.due_date,
      due_time: tk.due_time || '',
      priority: tk.priority ?? 3,
    });
    setTaskDialogOpen(true);
  };

  const tasksByCourse = filteredTasks.reduce((acc, task) => {
    const key = task.student_course_id ?? 'general';
    if (!acc[key]) acc[key] = { course_name: task.course_name || (language === 'ar' ? 'عام' : 'General'), tasks: [] };
    acc[key].tasks.push(task);
    return acc;
  }, {});
  const courseIds = Object.keys(tasksByCourse);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="animate-pulse h-96 rounded-[2rem]" />
        <Card className="lg:col-span-3 animate-pulse h-96 rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12" data-testid="planner-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">
            {t('planner.title')}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {language === 'ar' ? 'جدول يومك وأهدافك اليومية بناءً على أحداثك ومهامك' : 'Your daily schedule and goals based on your events and tasks'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" className="rounded-xl" onClick={handleGeneratePlan} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span className="mr-2 rtl:ml-2 rtl:mr-0">{language === 'ar' ? 'جدولة ذكية' : 'Smart plan'}</span>
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={openCompare}>
            <GitCompare className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {language === 'ar' ? 'مقارنة الجدول' : 'Compare'}
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={openFeedback}>
            <MessageSquare className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {language === 'ar' ? 'رأي التطبيق' : 'Feedback'}
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => { resetTaskForm(); setFormTask(f => ({ ...f, due_date: dateStr })); setTaskDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {language === 'ar' ? 'إضافة مهمة' : 'Add task'}
          </Button>
          <Button type="button" className="rounded-xl" onClick={() => { resetEventForm(); setFormEvent(f => ({ ...f, start_date: dateStr, end_date: dateStr })); setEventDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {language === 'ar' ? 'إضافة حدث' : 'Add event'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="space-y-6">
          <Card className="rounded-[2rem] border shadow-sm bg-card/50 p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-xl"
            />
          </Card>
          <Card className="rounded-[2rem] border shadow-sm bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="font-bold font-display">{t('planner.dailyGoals')}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {language === 'ar' ? 'مهام اليوم حسب المادة' : 'Today\'s tasks by course'}
            </p>
            {courseIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'لا توجد مهام' : 'No tasks'}</p>
            ) : (
              <ul className="space-y-3">
                {courseIds.map((key) => {
                  const { course_name, tasks } = tasksByCourse[key];
                  const allDone = tasks.every(t => t.completed);
                  const doneCount = tasks.filter(t => t.completed).length;
                  return (
                    <li key={key} className="flex items-center gap-2">
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0",
                        allDone ? "bg-primary border-primary" : "border-muted-foreground/30"
                      )}>
                        {allDone && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-sm font-medium truncate">{course_name}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{doneCount}/{tasks.length}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6 min-w-0">
          <Card className="rounded-xl sm:rounded-[2rem] border shadow-sm bg-card/50 overflow-hidden">
            <CardHeader className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b bg-muted/20">
              <CardTitle className="text-xl font-display">{t('planner.todaySchedule')}</CardTitle>
              <CardDescription>
                {selectedDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </CardDescription>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:left-auto rtl:right-3" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث عن حدث أو مهمة بالاسم...' : 'Search event or task by name...'}
                  className="pl-9 rtl:pl-4 rtl:pr-9 rounded-xl bg-background"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <Label className="text-muted-foreground text-xs shrink-0 whitespace-nowrap">
                    {language === 'ar' ? 'نوع الحدث' : 'Event type'}
                  </Label>
                  <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                    <SelectTrigger className="w-[140px] sm:w-[160px] rounded-xl h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                      <SelectItem value="exam">{language === 'ar' ? 'امتحان' : 'Exam'}</SelectItem>
                      <SelectItem value="study">{language === 'ar' ? 'دراسة' : 'Study'}</SelectItem>
                      <SelectItem value="project">{language === 'ar' ? 'مشروع' : 'Project'}</SelectItem>
                      <SelectItem value="other">{language === 'ar' ? 'أخرى' : 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Label className="text-muted-foreground text-xs shrink-0 whitespace-nowrap">
                    {language === 'ar' ? 'المادة' : 'Course'}
                  </Label>
                  <Select value={courseFilter} onValueChange={setCourseFilter}>
                    <SelectTrigger className="w-[160px] sm:w-[180px] rounded-xl h-9">
                      <SelectValue placeholder={language === 'ar' ? 'الكل' : 'All'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'ar' ? 'كل المواد' : 'All courses'}</SelectItem>
                      <SelectItem value="general">{language === 'ar' ? 'عام (بدون مادة)' : 'General (no course)'}</SelectItem>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.course_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="events" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 px-4 sm:px-6 h-12">
                  <TabsTrigger value="events" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                    {language === 'ar' ? 'الأحداث' : 'Events'}
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                    {language === 'ar' ? 'المهام' : 'Tasks'}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="events" className="m-0">
                  {daily.events.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>{language === 'ar' ? 'لا توجد أحداث لهذا اليوم' : 'No events for this day'}</p>
                      <Button variant="outline" className="rounded-full mt-4" onClick={() => setEventDialogOpen(true)}>
                        {language === 'ar' ? 'إضافة حدث' : 'Add event'}
                      </Button>
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>{language === 'ar' ? 'لا توجد أحداث تطابق البحث' : 'No events match your search'}</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredEvents.slice().sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')).map((ev) => (
                        <div key={ev.id} className="flex flex-col sm:flex-row group hover:bg-muted/20 transition-all">
                          <div className="w-full sm:w-20 md:w-24 py-3 sm:py-6 px-4 sm:px-4 sm:text-right shrink-0 flex sm:block items-center gap-2">
                            <span className="text-sm font-bold text-muted-foreground">{ev.start_time?.slice(0, 5)}</span>
                          </div>
                          <div className="flex-1 min-w-0 py-3 sm:py-6 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                              <div className={cn(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0",
                                ev.completed ? "bg-green-100 text-green-600 dark:bg-green-900/30" : "bg-primary/10 text-primary"
                              )}>
                                {ev.completed ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Clock className="w-4 h-4 sm:w-5 sm:h-5" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                  <h4 className="font-bold text-foreground break-words">{ev.title}</h4>
                                  {ev.event_type && <Badge variant="outline" className="rounded-full text-[10px] shrink-0">{ev.event_type}</Badge>}
                                  {ev.completed && <Badge className="rounded-full text-[10px] bg-green-100 text-green-600 shrink-0">{language === 'ar' ? 'مكتمل' : 'Done'}</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                                  <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                                  {ev.course_name || (language === 'ar' ? 'عام' : 'General')}
                                  <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                                  {ev.start_time?.slice(0, 5)} – {ev.end_time?.slice(0, 5)}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shrink-0">
                              {!ev.completed && (
                                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => api.patch(`/planner/events/${ev.id}`, { completed: true }).then(fetchDaily)}>
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => openEditEvent(ev)}><Pencil className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={() => handleDeleteEvent(ev.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="tasks" className="m-0">
                  {daily.tasks.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground">
                      <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>{language === 'ar' ? 'لا توجد مهام لهذا اليوم' : 'No tasks for this day'}</p>
                      <p className="text-sm mt-1">{language === 'ar' ? 'أضف مهامك ثم قارنها بجدول التطبيق' : 'Add your tasks then compare with the app plan'}</p>
                      <Button className="rounded-full mt-4" onClick={() => { resetTaskForm(); setFormTask(f => ({ ...f, due_date: dateStr })); setTaskDialogOpen(true); }}>
                        {language === 'ar' ? 'إضافة مهمة' : 'Add task'}
                      </Button>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>{language === 'ar' ? 'لا توجد مهام تطابق البحث' : 'No tasks match your search'}</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      <div className="py-3 px-4 sm:px-6 flex justify-end">
                        <Button variant="outline" size="sm" className="rounded-lg" onClick={() => { resetTaskForm(); setFormTask(f => ({ ...f, due_date: dateStr })); setTaskDialogOpen(true); }}>
                          <Plus className="w-3.5 h-3.5 mr-1 rtl:ml-1" />
                          {language === 'ar' ? 'إضافة مهمة' : 'Add task'}
                        </Button>
                      </div>
                      {courseIds.map((key) => {
                        const { course_name, tasks } = tasksByCourse[key];
                        const allDone = tasks.every(t => t.completed);
                        return (
                          <div key={key} className="py-4 px-4 sm:px-6">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <div className={cn(
                                "w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer shrink-0",
                                allDone ? "bg-primary border-primary" : "border-muted-foreground/30"
                              )}>
                                {allDone && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <span className="font-semibold">{course_name}</span>
                              <Badge variant="secondary" className="text-[10px]">{tasks.filter(t => t.completed).length}/{tasks.length}</Badge>
                            </div>
                            <ul className="space-y-2 pl-5 sm:pl-7">
                              {tasks.map((task) => (
                                <li key={task.id} className="flex flex-wrap items-center gap-2 sm:gap-3 group">
                                  <button
                                    type="button"
                                    className={cn(
                                      "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                      task.completed ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary/50"
                                    )}
                                    onClick={() => handleToggleTask(task)}
                                  >
                                    {task.completed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                  </button>
                                  <span className={cn("flex-1 text-sm", task.completed && "line-through text-muted-foreground")}>{task.title}</span>
                                  {task.source === 'app' && <Badge variant="outline" className="text-[10px] rounded-full">{language === 'ar' ? 'مقترح' : 'Suggested'}</Badge>}
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openEditTask(task)}><Pencil className="w-3.5 h-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => handleDeleteTask(task.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={(open) => { if (!open) resetEventForm(); setEventDialogOpen(open); }}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEvent ? (language === 'ar' ? 'تعديل الحدث' : 'Edit event') : (language === 'ar' ? 'إضافة حدث' : 'Add event')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEvent} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المادة (اختياري)' : 'Course (optional)'}</Label>
              <Select value={String(formEvent.student_course_id)} onValueChange={(v) => setFormEvent({ ...formEvent, student_course_id: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder={language === 'ar' ? 'اختر المادة' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.course_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'العنوان' : 'Title'}</Label>
              <Input value={formEvent.title} onChange={(e) => setFormEvent({ ...formEvent, title: e.target.value })} required className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'تاريخ البداية' : 'Start date'}</Label>
                <Input type="date" value={formEvent.start_date} onChange={(e) => setFormEvent({ ...formEvent, start_date: e.target.value })} required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'تاريخ النهاية' : 'End date'}</Label>
                <Input type="date" value={formEvent.end_date} onChange={(e) => setFormEvent({ ...formEvent, end_date: e.target.value })} required className="rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'وقت البداية' : 'Start time'}</Label>
                <Input type="time" value={formEvent.start_time} onChange={(e) => setFormEvent({ ...formEvent, start_time: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'وقت النهاية' : 'End time'}</Label>
                <Input type="time" value={formEvent.end_time} onChange={(e) => setFormEvent({ ...formEvent, end_time: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع الحدث' : 'Type'}</Label>
              <Select value={formEvent.event_type} onValueChange={(v) => setFormEvent({ ...formEvent, event_type: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="study">{language === 'ar' ? 'دراسة' : 'Study'}</SelectItem>
                  <SelectItem value="exam">{language === 'ar' ? 'امتحان' : 'Exam'}</SelectItem>
                  <SelectItem value="project">{language === 'ar' ? 'مشروع' : 'Project'}</SelectItem>
                  <SelectItem value="other">{language === 'ar' ? 'أخرى' : 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setEventDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" className="flex-1 rounded-xl">{t('common.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task add/edit — Alert so the page stays visible */}
      <AlertDialog open={taskDialogOpen} onOpenChange={(open) => { if (!open) resetTaskForm(); setTaskDialogOpen(open); }}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{editingTask ? (language === 'ar' ? 'تعديل المهمة' : 'Edit task') : (language === 'ar' ? 'إضافة مهمة' : 'Add task')}</AlertDialogTitle>
          </AlertDialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveTask(e);
            }}
            className="space-y-3 mt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs">{language === 'ar' ? 'المادة (اختياري)' : 'Course (optional)'}</Label>
              <Select value={String(formTask.student_course_id)} onValueChange={(v) => setFormTask((f) => ({ ...f, student_course_id: v }))}>
                <SelectTrigger className="rounded-lg h-9"><SelectValue placeholder={language === 'ar' ? 'اختر المادة' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {courses.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.course_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{language === 'ar' ? 'العنوان' : 'Title'}</Label>
              <Input value={formTask.title || ''} onChange={(e) => setFormTask((f) => ({ ...f, title: e.target.value }))} required className="rounded-lg h-9" placeholder={language === 'ar' ? 'عنوان المهمة' : 'Task title'} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due date'}</Label>
                <Input type="date" value={formTask.due_date || dateStr} onChange={(e) => setFormTask((f) => ({ ...f, due_date: e.target.value }))} required className="rounded-lg h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{language === 'ar' ? 'الأولوية' : 'Priority'}</Label>
                <Select value={String(formTask.priority ?? 3)} onValueChange={(v) => setFormTask((f) => ({ ...f, priority: parseInt(v, 10) }))}>
                  <SelectTrigger className="rounded-lg h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
              <AlertDialogCancel type="button" className="rounded-xl">{t('common.cancel')}</AlertDialogCancel>
              <Button type="submit" className="rounded-xl">{t('common.save')}</Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Compare dialog */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'مقارنة جدول التطبيق بجدولك' : 'Compare app plan vs your plan'}</DialogTitle>
            <CardDescription>{dateStr}</CardDescription>
          </DialogHeader>
          {compareData && (
            <>
              {compareData.ai_comparison && (
                <div className="mt-4 p-4 rounded-xl border bg-primary/5 border-primary/20">
                  <p className="text-sm font-medium text-foreground mb-1">{language === 'ar' ? 'تحليل المقارنة (ذكاء اصطناعي)' : 'AI comparison'}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{compareData.ai_comparison}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <Card className="rounded-xl border-secondary/30 bg-secondary/5">
                <CardHeader className="pb-2"><CardTitle className="text-base">{language === 'ar' ? 'مقترح التطبيق' : 'App suggested'}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(compareData.app_plan || []).length === 0 ? <p className="text-sm text-muted-foreground">{language === 'ar' ? 'لا مهام مقترحة' : 'No suggested tasks'}</p> : (compareData.app_plan || []).map(t => <div key={t.id} className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />{t.title} {t.course_name && <Badge variant="outline" className="text-[10px]">{t.course_name}</Badge>}</div>)}
                </CardContent>
              </Card>
              <Card className="rounded-xl border-primary/30 bg-primary/5">
                <CardHeader className="pb-2"><CardTitle className="text-base">{language === 'ar' ? 'جدولك' : 'Your plan'}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(compareData.student_plan || []).length === 0 ? <p className="text-sm text-muted-foreground">{language === 'ar' ? 'لا مهام' : 'No tasks'}</p> : (compareData.student_plan || []).map(t => <div key={t.id} className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />{t.title} {t.course_name && <Badge variant="outline" className="text-[10px]">{t.course_name}</Badge>}</div>)}
                </CardContent>
              </Card>
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Feedback dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="rounded-2xl max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'رأي التطبيق في مخططك' : 'App feedback on your plan'}</DialogTitle>
            <CardDescription>{dateStr}</CardDescription>
          </DialogHeader>
          {feedbackData && (
            <div className="mt-4 space-y-4">
              {feedbackData.ai_feedback && (
                <div className="p-4 rounded-xl border bg-primary/5 border-primary/20">
                  <p className="text-sm font-medium text-foreground mb-1">{language === 'ar' ? 'رأي التطبيق المفصل (ذكاء اصطناعي)' : 'Detailed AI feedback'}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{feedbackData.ai_feedback}</p>
                </div>
              )}
              <p className="text-sm font-medium leading-relaxed">{feedbackData.summary}</p>
              {feedbackData.details?.length > 0 && (
                <div className="space-y-3">
                  {feedbackData.details.map((d, i) => (
                    <div key={i} className="rounded-xl border bg-muted/30 p-4 space-y-1">
                      <h4 className="text-sm font-semibold text-foreground">
                        {language === 'ar' ? d.title_ar : d.title_en}
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {language === 'ar' ? d.body_ar : d.body_en}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {feedbackData.feedback?.length > 0 && !feedbackData.details?.length && (
                <ul className="space-y-2">
                  {feedbackData.feedback.map((f, i) => (
                    <li key={i} className="text-sm p-3 rounded-xl bg-muted/50 border">
                      {f.recommendation || f.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
