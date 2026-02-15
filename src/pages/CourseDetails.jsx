import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Plus, 
  ChevronLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Trash2,
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  MessageSquare,
  Pencil
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { cn, getGradeColor, gradeToLetter, getGradeStatus, getGradeStatusColor } from '@/lib/utils';
import { toast } from 'sonner';

export default function CourseDetails() {
  const { courseId } = useParams();
  const { api, user } = useAuth();
  const { t, language } = useLanguage();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [grades, setGrades] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef(null);
  
  // Dialog states
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [newModule, setNewModule] = useState({ title: '', description: '' });
  const [newGrade, setNewGrade] = useState({ 
    item_type: 'quiz', 
    title: '', 
    score: 0, 
    max_score: 100, 
    weight: 10 
  });

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchCourseData = async () => {
    try {
      const [courseRes, modulesRes, gradesRes, chatRes] = await Promise.all([
        api.get(`/student/courses/${courseId}`),
        api.get(`/courses/${courseId}/modules`),
        api.get(`/courses/${courseId}/grades`),
        api.get(`/courses/${courseId}/chat`)
      ]);
      setCourse(courseRes.data);
      setModules(modulesRes.data);
      const rawGrades = Array.isArray(gradesRes.data) ? gradesRes.data : [];
      setGrades(rawGrades.map((g) => ({ ...g, id: Number(g.id) })));
      setChatMessages(chatRes.data);
    } catch (error) {
      console.error('Course details error:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/courses/${courseId}/modules`, {
        ...newModule,
        course_id: courseId,
        order: modules.length
      });
      toast.success(language === 'ar' ? 'تم إضافة الوحدة' : 'Module added');
      setModuleDialogOpen(false);
      setNewModule({ title: '', description: '' });
      fetchCourseData();
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleAddGrade = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/courses/${courseId}/grades`, {
        ...newGrade,
        course_id: courseId
      });
      toast.success(language === 'ar' ? 'تم إضافة الدرجة' : 'Grade added');
      setGradeDialogOpen(false);
      setNewGrade({ item_type: 'quiz', title: '', score: 0, max_score: 100, weight: 10 });
      fetchCourseData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    }
  };

  const handleEditGrade = (grade) => {
    setEditingGrade(grade);
    setNewGrade({
      item_type: grade.item_type,
      title: grade.title,
      score: grade.score,
      max_score: grade.max_score,
      weight: grade.weight,
    });
  };

  const handleSaveEditGrade = async (e) => {
    e.preventDefault();
    if (!editingGrade) return;
    const gradeId = Number(editingGrade.id);
    if (!Number.isFinite(gradeId) || gradeId < 1) {
      toast.error(language === 'ar' ? 'معرّف الدرجة غير صالح' : 'Invalid grade id');
      return;
    }
    try {
      const payload = {
        item_type: newGrade.item_type,
        title: newGrade.title,
        score: Number(newGrade.score),
        max_score: Number(newGrade.max_score),
        weight: Number(newGrade.weight),
      };
      await api.patch(`/grades/${gradeId}`, payload);
      toast.success(language === 'ar' ? 'تم تحديث الدرجة' : 'Grade updated');
      setEditingGrade(null);
      setGradeDialogOpen(false);
      setNewGrade({ item_type: 'quiz', title: '', score: 0, max_score: 100, weight: 10 });
      fetchCourseData();
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (error.response?.status === 401 ? (language === 'ar' ? 'يجب تسجيل الدخول من جديد' : 'Please log in again') : (error.response ? (language === 'ar' ? 'خطأ من الخادم' : 'Server error') : (language === 'ar' ? 'تحقق من الاتصال بالسيرفر' : 'Check server connection')));
      toast.error(msg);
    }
  };

  const handleDeleteGrade = async (gradeId) => {
    const id = Number(gradeId);
    if (!Number.isFinite(id) || id < 1) {
      toast.error(language === 'ar' ? 'معرّف الدرجة غير صالح' : 'Invalid grade id');
      return;
    }
    try {
      await api.delete(`/grades/${id}`);
      toast.success(language === 'ar' ? 'تم حذف الدرجة' : 'Grade deleted');
      fetchCourseData();
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (error.response?.status === 401 ? (language === 'ar' ? 'يجب تسجيل الدخول من جديد' : 'Please log in again') : (error.response ? (language === 'ar' ? 'خطأ من الخادم' : 'Server error') : (language === 'ar' ? 'تحقق من الاتصال بالسيرفر' : 'Check server connection')));
      toast.error(msg);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage, id: Date.now() }]);
    setChatLoading(true);
    
    try {
      const response = await api.post('/ai/course_chat', {
        course_id: courseId,
        content: userMessage
      });
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.content, id: Date.now() + 1 }]);
    } catch (error) {
      toast.error(language === 'ar' ? 'خدمة AI غير متاحة' : 'AI service unavailable');
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await api.delete(`/courses/${courseId}/chat`);
      setChatMessages([]);
      toast.success(language === 'ar' ? 'تم مسح المحادثة' : 'Chat cleared');
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleMarkFinished = async () => {
    setFinalizing(true);
    try {
      await api.post(`/courses/${courseId}/finalize`);
      toast.success(language === 'ar' ? 'تم إنهاء المادة وتحديث الساعات المنجزة/المحمولة' : 'Course marked as finished; credits updated');
      fetchCourseData();
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : (language === 'ar' ? 'أدخل علامة واحدة على الأقل قبل إنهاء المادة' : 'Add at least one grade before marking as finished'));
    } finally {
      setFinalizing(false);
    }
  };

  const totalWeight = grades.reduce((sum, g) => sum + g.weight, 0);
  const isFinalized = course?.finalized_at != null || course?.finalizedAt != null;

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse h-48 rounded-[2rem]" />
        <Card className="animate-pulse h-96 rounded-[2rem]" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{language === 'ar' ? 'المادة غير موجودة' : 'Course not found'}</p>
        <Link to="/courses">
          <Button className="mt-4">{t('common.back')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12" data-testid="course-details-page">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/courses">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0">
            <ChevronLeft className="w-5 h-5 rtl-flip" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="secondary" className="rounded-full text-xs font-bold">
              {course.course_code || 'N/A'}
            </Badge>
            <Badge variant="outline" className="rounded-full text-xs">
              {course.semester}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold font-display">{course.course_name}</h1>
          {course.professor_name && (
            <p className="text-muted-foreground mt-1">{course.professor_name}</p>
          )}
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <p className="text-sm text-muted-foreground">{t('courses.currentGrade')}</p>
          <p className={cn("text-4xl font-bold font-display", course.current_grade != null ? getGradeColor(course.current_grade) : "text-muted-foreground")}>
            {course.current_grade != null ? `${Number(course.current_grade).toFixed(1)}%` : 'N/A'}
          </p>
          <p className="text-sm text-muted-foreground">{gradeToLetter(course.current_grade ?? null) ?? '—'}</p>
          {course.current_grade != null && (
            <Badge className={cn("rounded-full", getGradeStatusColor(getGradeStatus(course.current_grade)))}>
              {language === 'ar'
                ? (getGradeStatus(course.current_grade) === 'safe' ? 'آمن' : getGradeStatus(course.current_grade) === 'normal' ? 'وضع عادي' : getGradeStatus(course.current_grade) === 'at_risk' ? 'خطر' : 'خطر عالي')
                : getGradeStatus(course.current_grade)}
            </Badge>
          )}
          {isFinalized ? (
            <Badge variant="secondary" className="rounded-full mt-1 gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {language === 'ar' ? 'منتهية' : 'Finished'}
            </Badge>
          ) : (
            <Button
              size="sm"
              className="rounded-full mt-1 gap-1.5"
              onClick={handleMarkFinished}
              disabled={finalizing || course.current_grade == null}
              title={course.current_grade == null ? (language === 'ar' ? 'أدخل علامة واحدة على الأقل أولاً' : 'Add at least one grade first') : (language === 'ar' ? 'إنهاء المادة وتحديث الساعات المنجزة أو المحمولة' : 'Mark course finished and update credits')}
            >
              {finalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {language === 'ar' ? 'انتهى' : 'Mark finished'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('courses.progress')}</p>
          <p className="text-2xl font-bold mt-1">{course.progress?.toFixed(0) || 0}%</p>
        </Card>
        <Card className="rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('courses.difficulty')}</p>
          <p className="text-2xl font-bold mt-1">{course.difficulty}/10</p>
        </Card>
        <Card className="rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('courses.credits')}</p>
          <p className="text-2xl font-bold mt-1">{course.credit_hours || 3}</p>
        </Card>
        <Card className="rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('courses.targetGrade')}</p>
          <p className="text-2xl font-bold mt-1">{course.target_grade || 85}%</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-2xl">
          <TabsTrigger value="overview" className="rounded-xl">{language === 'ar' ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
          <TabsTrigger value="modules" className="rounded-xl">{t('courses.modules')}</TabsTrigger>
          <TabsTrigger value="grades" className="rounded-xl">{t('courses.grades')}</TabsTrigger>
          <TabsTrigger value="ai-coach" className="rounded-xl">{t('courses.aiCoach')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle>{t('courses.description')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{course.description || (language === 'ar' ? 'لا يوجد وصف' : 'No description available')}</p>
            </CardContent>
          </Card>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="rounded-[2rem]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('courses.modules')}</CardTitle>
                <Badge variant="secondary">{modules.length}</Badge>
              </CardHeader>
              <CardContent>
                {modules.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">{language === 'ar' ? 'لا توجد وحدات' : 'No modules yet'}</p>
                ) : (
                  <div className="space-y-2">
                    {modules.slice(0, 3).map((module) => (
                      <div key={module.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span className="font-medium">{module.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="rounded-[2rem]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('courses.grades')}</CardTitle>
                <Badge variant="secondary">{grades.length}</Badge>
              </CardHeader>
              <CardContent>
                {grades.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">{language === 'ar' ? 'لا توجد درجات' : 'No grades yet'}</p>
                ) : (
                  <div className="space-y-2">
                    {grades.slice(0, 3).map((grade) => (
                      <div key={grade.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="font-medium">{grade.title}</span>
                        </div>
                        <span className="font-bold">{grade.score}/{grade.max_score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold font-display">{t('courses.modules')}</h3>
            <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('courses.addModule')}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>{t('courses.addModule')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddModule} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'عنوان الوحدة' : 'Module Title'}</Label>
                    <Input 
                      value={newModule.title}
                      onChange={(e) => setNewModule({...newModule, title: e.target.value})}
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('courses.description')}</Label>
                    <Textarea 
                      value={newModule.description}
                      onChange={(e) => setNewModule({...newModule, description: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setModuleDialogOpen(false)} className="flex-1 rounded-xl">
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" className="flex-1 rounded-xl">{t('common.save')}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          {modules.length === 0 ? (
            <Card className="rounded-[2rem] p-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{language === 'ar' ? 'لا توجد وحدات بعد. أضف وحدة جديدة!' : 'No modules yet. Add your first module!'}</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {modules.map((module, index) => (
                <Card key={module.id} className="rounded-2xl">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                      {module.description && (
                        <CardDescription>{module.description}</CardDescription>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Grades Tab */}
        <TabsContent value="grades" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold font-display">{t('courses.grades')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('courses.totalWeight')}: {totalWeight}% / 100%
              </p>
            </div>
            <Dialog open={gradeDialogOpen || !!editingGrade} onOpenChange={(open) => { if (!open) { setGradeDialogOpen(false); setEditingGrade(null); setNewGrade({ item_type: 'quiz', title: '', score: 0, max_score: 100, weight: 10 }); } else setGradeDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button className="rounded-xl" disabled={totalWeight >= 100 && !editingGrade} onClick={() => setEditingGrade(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('courses.addGrade')}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>{editingGrade ? (language === 'ar' ? 'تعديل الدرجة' : 'Edit grade') : t('courses.addGrade')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={editingGrade ? handleSaveEditGrade : handleAddGrade} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('courses.gradeType')}</Label>
                      <Select value={newGrade.item_type} onValueChange={(v) => setNewGrade({...newGrade, item_type: v})}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quiz">{t('courses.quiz')}</SelectItem>
                          <SelectItem value="midterm">{t('courses.midterm')}</SelectItem>
                          <SelectItem value="final">{t('courses.final')}</SelectItem>
                          <SelectItem value="assignment">{t('courses.assignment')}</SelectItem>
                          <SelectItem value="project">{t('courses.project')}</SelectItem>
                          <SelectItem value="lab">{t('courses.lab')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'العنوان' : 'Title'}</Label>
                      <Input 
                        value={newGrade.title}
                        onChange={(e) => setNewGrade({...newGrade, title: e.target.value})}
                        required
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{t('courses.score')}</Label>
                      <Input 
                        type="number"
                        min="0"
                        value={newGrade.score}
                        onChange={(e) => setNewGrade({...newGrade, score: parseFloat(e.target.value)})}
                        required
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('courses.maxScore')}</Label>
                      <Input 
                        type="number"
                        min="1"
                        value={newGrade.max_score}
                        onChange={(e) => setNewGrade({...newGrade, max_score: parseFloat(e.target.value)})}
                        required
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('courses.weight')} %</Label>
                      <Input 
                        type="number"
                        min="1"
                        max={editingGrade ? 100 - (totalWeight - (editingGrade?.weight || 0)) : 100 - totalWeight}
                        value={newGrade.weight}
                        onChange={(e) => setNewGrade({...newGrade, weight: parseFloat(e.target.value)})}
                        required
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? `الوزن المتاح: ${editingGrade ? 100 - (totalWeight - (editingGrade?.weight || 0)) : 100 - totalWeight}%` : `Available weight: ${editingGrade ? 100 - (totalWeight - (editingGrade?.weight || 0)) : 100 - totalWeight}%`}
                  </p>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setGradeDialogOpen(false)} className="flex-1 rounded-xl">
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" className="flex-1 rounded-xl">{t('common.save')}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <Progress value={totalWeight} className="h-2" />
          
          {grades.length === 0 ? (
            <Card className="rounded-[2rem] p-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{language === 'ar' ? 'لا توجد درجات بعد. أضف درجة جديدة!' : 'No grades yet. Add your first grade!'}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {grades.map((grade) => (
                <Card key={grade.id} className="rounded-2xl">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold uppercase", 
                        grade.item_type === 'final' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                        grade.item_type === 'midterm' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' :
                        'bg-primary/10 text-primary'
                      )}>
                        {grade.item_type.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-bold">{grade.title}</p>
                        <p className="text-sm text-muted-foreground">{t(`courses.${grade.item_type}`)} • {grade.weight}% {t('courses.weight')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { handleEditGrade(grade); setGradeDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <div className="text-right">
                        <p className={cn("text-xl font-bold", getGradeColor(grade.max_score ? (grade.score / grade.max_score) * 100 : 0))}>
                          {grade.score}/{grade.max_score}
                        </p>
                        <p className="text-xs text-muted-foreground">{grade.max_score ? ((grade.score / grade.max_score) * 100).toFixed(0) : 0}%</p>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-full text-destructive hover:bg-destructive/10" onClick={() => handleDeleteGrade(grade.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* AI Coach Tab */}
        <TabsContent value="ai-coach" className="space-y-6">
          <Card className="rounded-[2rem] h-[600px] flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t('aiChat.title')}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {t('aiChat.onlineReady')}
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={handleClearChat}>
                <Trash2 className="w-4 h-4 mr-2" />
                {t('aiChat.clearChat')}
              </Button>
            </CardHeader>
            
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{language === 'ar' ? 'ابدأ محادثة مع المدرب الذكي' : 'Start a conversation with the AI Coach'}</p>
                  </div>
                )}
                {chatMessages.map((message) => (
                  <div 
                    key={message.id} 
                    className={cn(
                      "flex gap-3 max-w-[85%]",
                      message.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <Avatar className={cn("w-8 h-8 shrink-0", message.role === 'assistant' ? "bg-primary/10" : "bg-secondary/10")}>
                      <AvatarFallback>
                        {message.role === 'assistant' ? <Bot className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-secondary" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed",
                      message.role === 'assistant' 
                        ? "bg-muted/50 border rounded-tl-none" 
                        : "bg-primary text-primary-foreground rounded-tr-none"
                    )}>
                      {message.content.split('\n').map((line, i) => (
                        <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-3 mr-auto">
                    <Avatar className="w-8 h-8 bg-primary/10">
                      <AvatarFallback><Bot className="w-4 h-4 text-primary" /></AvatarFallback>
                    </Avatar>
                    <div className="p-4 rounded-2xl bg-muted/50 border rounded-tl-none flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm">{t('aiChat.thinking')}</span>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t bg-muted/20 shrink-0">
              <div className="relative flex items-center gap-2">
                <Input 
                  placeholder={t('aiChat.askAnything')}
                  className="h-12 pl-4 pr-14 rounded-full border-primary/10 bg-background"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  data-testid="ai-chat-input"
                />
                <Button 
                  size="icon" 
                  className="absolute right-1 h-10 w-10 rounded-full shadow-lg"
                  onClick={handleSendChat}
                  disabled={chatLoading || !chatInput.trim()}
                  data-testid="ai-chat-send"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-[10px] text-center mt-2 text-muted-foreground flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                {t('aiChat.poweredBy')}
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
