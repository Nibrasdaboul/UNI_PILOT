import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Plus,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  ArrowUpRight,
  Filter,
  GraduationCap,
  Sparkles,
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { cn, getEventColor, gradeToLetter, getGradeStatusColor } from '@/lib/utils';
import { toast } from 'sonner';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

export default function Dashboard() {
  const { user, api } = useAuth();
  const { t, language } = useLanguage();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [creditsDialog, setCreditsDialog] = useState(null); // 'completed' | 'carried' | null

  useEffect(() => {
    fetchDashboardData();
  }, [location.pathname]);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/summary');
      setData(response.data);
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse h-32 rounded-[2rem]" />
        ))}
      </div>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] || 'Student';

  return (
    <div className="space-y-6 sm:space-y-8 pb-8 sm:pb-12" data-testid="dashboard-page">
      {/* Welcome Section */}
      <AnimatedSection variant="fadeUp">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">
              {t('dashboard.welcomeBack')}, {firstName} 👋
            </h2>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              {language === 'ar'
                ? `لديك ${data?.pending_tasks || 0} ${t('dashboard.upcomingItems')}`
                : `You have ${data?.pending_tasks || 0} ${t('dashboard.upcomingItems')}`
              }
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 shrink-0">
            <Button variant="outline" className="rounded-xl h-10 sm:h-11 border-primary/20 hover:bg-primary/5 btn-3d text-sm">
              <Filter className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('common.filter')}
            </Button>
            <Link to="/courses">
              <Button className="rounded-xl h-10 sm:h-11 shadow-lg shadow-primary/20 btn-3d text-sm" data-testid="new-course-btn">
                <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t('dashboard.newCourse')}
              </Button>
            </Link>
          </div>
        </div>
      </AnimatedSection>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        {[
          { title: language === 'ar' ? 'المعدل الفصلي (4)' : 'Semester GPA (4)', value: (data?.semester_gpa ?? data?.current_gpa) != null ? Number(data.semester_gpa ?? data.current_gpa).toFixed(2) : '0.00', trend: (data?.semester_percent != null ? (data.semester_percent + '%') : '') + (language === 'ar' ? ' نسبة الفصل' : ' semester %'), icon: TrendingUp, color: 'primary' },
          { title: language === 'ar' ? 'المعدل التراكمي' : 'CGPA', value: (data?.cgpa ?? data?.current_gpa) != null ? Number(data.cgpa ?? data.current_gpa).toFixed(2) : '0.00', trend: (data?.cumulative_percent != null ? (data.cumulative_percent + '%') : '') + (language === 'ar' ? ' نسبة تراكمية' : ' cumulative %'), icon: GraduationCap, color: 'secondary' },
          { title: language === 'ar' ? 'الساعات المنجزة' : 'Credits completed', value: String(data?.credits_completed ?? 0), trend: language === 'ar' ? 'ناجح' : 'passed', icon: BookOpen, color: 'accent', dialogKey: 'completed' },
          { title: language === 'ar' ? 'الساعات المحمولة' : 'Credits carried', value: String(data?.credits_carried ?? 0), trend: language === 'ar' ? 'راسب' : 'failed', icon: AlertCircle, color: 'primary', dialogKey: 'carried' },
          { title: language === 'ar' ? 'الساعات الحالية' : 'Current credits', value: String(data?.credits_current ?? 0), trend: language === 'ar' ? 'هذا الفصل' : 'this semester', icon: Clock, color: 'primary' },
        ].map((s, i) => (
          <AnimatedSection key={i} variant="fadeUp" delay={i + 1}>
            <div
              className={s.dialogKey ? 'cursor-pointer' : ''}
              onClick={s.dialogKey ? () => setCreditsDialog(s.dialogKey) : undefined}
              onKeyDown={s.dialogKey ? (e) => e.key === 'Enter' && setCreditsDialog(s.dialogKey) : undefined}
              role={s.dialogKey ? 'button' : undefined}
              tabIndex={s.dialogKey ? 0 : undefined}
            >
              <StatsCard title={s.title} value={s.value} trend={s.trend} icon={s.icon} color={s.color} />
            </div>
          </AnimatedSection>
        ))}
      </div>

      {/* Dialog: completed or carried courses list */}
      <Dialog open={!!creditsDialog} onOpenChange={(open) => !open && setCreditsDialog(null)}>
        <DialogContent className="max-w-md sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {creditsDialog === 'completed'
                ? (language === 'ar' ? 'المواد المنجزة (ناجح)' : 'Completed courses (passed)')
                : (language === 'ar' ? 'المواد المحمولة (راسب)' : 'Carried courses (failed)')}
            </DialogTitle>
            <DialogDescription>
              {creditsDialog === 'completed'
                ? (language === 'ar' ? 'المواد التي أنهيتها بنجاح — الاسم، المعدل من 4، النسبة، التقدير' : 'Courses you passed — name, GPA (4), %, letter grade')
                : (language === 'ar' ? 'المواد التي رسبت فيها — الاسم، المعدل من 4، النسبة، التقدير' : 'Courses you failed — name, GPA (4), %, letter grade')}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 space-y-2 pr-2">
            {creditsDialog === 'completed' && (data?.completed_courses?.length ? data.completed_courses.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border bg-muted/30">
                <span className="font-medium truncate">{c.course_name}</span>
                <span className="shrink-0 text-sm">
                  {c.gpa_points != null ? Number(c.gpa_points).toFixed(2) : '—'} / 4 · {c.percent != null ? Number(c.percent).toFixed(0) : '—'}% · {c.letter_grade ?? '—'}
                </span>
              </div>
            )) : (language === 'ar' ? 'لا توجد مواد منجزة.' : 'No completed courses.'))}
            {creditsDialog === 'carried' && (data?.carried_courses?.length ? data.carried_courses.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border bg-muted/30">
                <span className="font-medium truncate">{c.course_name}</span>
                <span className="shrink-0 text-sm">
                  {c.gpa_points != null ? Number(c.gpa_points).toFixed(2) : '—'} / 4 · {c.percent != null ? Number(c.percent).toFixed(0) : '—'}% · {c.letter_grade ?? '—'}
                </span>
              </div>
            )) : (language === 'ar' ? 'لا توجد مواد محمولة.' : 'No carried courses.'))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Upcoming Tasks */}
        <AnimatedSection variant="slideRight" className="lg:col-span-2">
        <Card className="rounded-2xl sm:rounded-[2rem] border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b bg-muted/20 px-4 sm:px-6 md:px-8 py-4 sm:py-6 min-w-0">
            <div>
              <CardTitle className="text-lg sm:text-xl font-display">{t('dashboard.academicTimeline')}</CardTitle>
              <CardDescription>{language === 'ar' ? 'المحاضرات والاختبارات والمواعيد القادمة' : 'Upcoming lectures, quizzes, and deadlines'}</CardDescription>
            </div>
            <Link to="/planner">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 rounded-full font-medium">
                {t('dashboard.viewCalendar')}
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {!data?.upcoming_tasks?.length ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <CalendarIcon className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-lg font-medium">{t('dashboard.noClear')}</p>
                  <p className="text-muted-foreground">{t('dashboard.noEvents')}</p>
                </div>
                <Link to="/planner">
                  <Button variant="outline" className="rounded-full px-6">{t('dashboard.addEvent')}</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y">
                {data.upcoming_tasks.map((task) => (
                  <div key={task.id} className="group hover:bg-muted/30 transition-all px-4 sm:px-6 md:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                        getEventColor(task.task_type)
                      )}>
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <h4 className="font-bold text-foreground truncate">{task.title}</h4>
                          <Badge variant="outline" className="rounded-full text-[10px] uppercase font-bold tracking-wider px-2 py-0 shrink-0">
                            {task.task_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                          <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                          {task.course_id ? 'Course Task' : 'General Task'}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <p className="font-bold text-foreground">
                        {new Date(task.due_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {task.estimated_hours}h {language === 'ar' ? 'المقدرة' : 'estimated'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </AnimatedSection>

        {/* AI Advisor Card */}
        <AnimatedSection variant="slideLeft">
        <Card className="rounded-2xl sm:rounded-[2rem] border shadow-sm flex flex-col bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10">
          <CardHeader className="px-8 pt-8 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Sparkles className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-display">{t('dashboard.aiAdvisor')}</CardTitle>
            <CardDescription>{language === 'ar' ? 'استراتيجية أكاديمية ذكية ورؤى' : 'Intelligent academic strategy and insights'}</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8 space-y-6 flex-1 flex flex-col">
            <div className="p-5 rounded-2xl bg-background/50 border border-primary/10 space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <AlertCircle className="w-10 h-10 text-primary" />
              </div>
              <h5 className="font-bold text-primary text-sm uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {t('dashboard.strategicWarning')}
              </h5>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {language === 'ar' 
                  ? 'راجع درجاتك الحالية وركز على المواد ذات الأولوية العالية لتحسين أدائك.'
                  : 'Review your current grades and focus on high-priority subjects to improve your performance.'
                }
              </p>
              <Link to="/ai-coach">
                <Button size="sm" variant="ghost" className="text-primary p-0 h-auto hover:bg-transparent font-bold">
                  {t('dashboard.generatePlan')} <ArrowUpRight className="ml-1 w-4 h-4 rtl:mr-1 rtl:ml-0" />
                </Button>
              </Link>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{t('dashboard.syllabusProgress')}</span>
                  <span className="font-bold text-primary">{data?.avg_progress?.toFixed(0) || 0}%</span>
                </div>
                <Progress value={data?.avg_progress || 0} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{t('dashboard.predictedGrade')}</span>
                  <span className="font-bold text-secondary">{gradeToLetter(data?.avg_progress || 75)}</span>
                </div>
                <Progress value={data?.avg_progress || 75} className="h-2" />
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-primary/10">
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                {language === 'ar'
                  ? '"التحسينات اليومية الصغيرة هي مفتاح النتائج الطويلة المدهشة."'
                  : '"Small daily improvements are the key to staggering long-term results."'
                }
              </p>
            </div>
          </CardContent>
        </Card>
        </AnimatedSection>
      </div>

      {/* Courses Overview */}
      {data?.courses?.length > 0 && (
        <AnimatedSection variant="fadeUp">
        <Card className="rounded-2xl sm:rounded-[2rem] border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl font-display">{t('nav.courses')}</CardTitle>
                <CardDescription>{language === 'ar' ? 'تقدم المواد الحالية' : 'Current courses progress'}</CardDescription>
              </div>
              <Link to="/courses">
                <Button variant="ghost" className="rounded-full text-primary hover:bg-primary/10">
                  {t('common.viewAll')}
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.courses.slice(0, 3).map((course) => (
                <Link key={course.id} to={`/courses/${course.id}`}>
                  <Card className="rounded-2xl border hover:border-primary/50 transition-all hover:shadow-lg cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="secondary" className="rounded-full text-[10px] font-bold">
                            {course.course_code || 'N/A'}
                          </Badge>
                          {course.grade_status && (
                            <Badge className={cn('rounded-full text-[10px]', getGradeStatusColor(course.grade_status))}>
                              {language === 'ar'
                                ? (course.grade_status === 'safe' ? 'آمن' : course.grade_status === 'normal' ? 'وضع عادي' : course.grade_status === 'at_risk' ? 'خطر' : 'خطر عالي')
                                : course.grade_status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <h4 className="font-bold mb-2 group-hover:text-primary transition-colors">{course.course_name}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('courses.currentGrade')}</span>
                          <span className="font-bold">{course.current_grade != null ? Number(course.current_grade).toFixed(1) + '%' : 'N/A'}</span>
                        </div>
                        <Progress value={course.current_grade ?? course.progress ?? 0} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        </AnimatedSection>
      )}
    </div>
  );
}

function StatsCard({ title, value, trend, icon: Icon, color }) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    accent: 'bg-accent/10 text-accent'
  };

  return (
    <Card className="rounded-2xl sm:rounded-[2rem] border shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden bg-card/50 backdrop-blur-sm">
      <CardContent className="p-5 sm:p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-3 rounded-2xl transition-all duration-300 group-hover:scale-110", colorClasses[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium tracking-wide uppercase">{title}</p>
          <h3 className="text-3xl font-bold font-display">{value}</h3>
          <p className="text-xs font-semibold text-muted-foreground pt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-primary" />
            {trend}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
