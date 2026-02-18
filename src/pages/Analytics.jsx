import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  BrainCircuit,
  Info,
  GraduationCap,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { cn, getGradeStatusColor, gradeToLetter } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_LABELS = { safe: 'آمن', normal: 'وضع عادي', at_risk: 'خطر', high_risk: 'خطر عالي' };

export default function Analytics() {
  const { api } = useAuth();
  const { t, language } = useLanguage();
  const location = useLocation();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [location.pathname]);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/analytics');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Analytics error:', error);
      toast.error(t('common.error'));
      setAnalytics({ courses: [], semester_gpa: 0, semester_percent: 0, cgpa: 0, cumulative_percent: 0, credits_completed: 0, credits_carried: 0, credits_current: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 animate-pulse h-96 rounded-[2rem]" />
        <Card className="animate-pulse h-96 rounded-[2rem]" />
      </div>
    );
  }

  const courses = analytics?.courses ?? [];
  const chartData = courses.map((c) => ({
    name: c.course_name?.length > 12 ? c.course_name.slice(0, 12) + '…' : c.course_name || '—',
    mark: c.final_mark ?? 0,
    fullMark: 100,
  }));

  const atRiskCourses = courses.filter((c) => c.status === 'at_risk' || c.status === 'high_risk');

  return (
    <div className="space-y-8 pb-12" data-testid="analytics-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">
            {t('analytics.title')}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {t('analytics.subtitle')}
          </p>
        </div>
        <Button className="rounded-xl h-11 shadow-lg shadow-primary/20 gap-2" onClick={fetchAnalytics}>
          <BrainCircuit className="w-4 h-4" />
          {t('analytics.regenerate')}
        </Button>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-xl sm:rounded-[2rem] border shadow-sm bg-card/50 backdrop-blur-sm min-w-0">
          <CardHeader className="px-4 sm:px-6 md:px-8 pt-6 sm:pt-8">
            <CardTitle className="text-xl font-display">{language === 'ar' ? 'تقدم الطالب بالعلامات' : 'Progress by grade'}</CardTitle>
            <CardDescription>{language === 'ar' ? 'العلامة النهائية لكل مادة' : 'Final mark per course'}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8 pt-4">
            {chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {language === 'ar' ? 'لا توجد بيانات للعرض. أضف مواد وعلامات.' : 'No data to display. Add courses and grades.'}
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '1rem',
                      }}
                      formatter={(value) => [value + '%', language === 'ar' ? 'العلامة' : 'Mark']}
                    />
                    <Bar dataKey="mark" name={language === 'ar' ? 'العلامة' : 'Mark'} radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={
                            entry.mark >= 80
                              ? 'hsl(var(--chart-1))'
                              : entry.mark >= 60
                                ? 'hsl(var(--chart-2))'
                                : 'hsl(var(--destructive))'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card className="rounded-xl sm:rounded-[2rem] border shadow-sm bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10 overflow-hidden min-w-0">
          <CardHeader className="px-4 sm:px-6 md:px-8 pt-6 sm:pt-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
              <GraduationCap className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl font-display">{language === 'ar' ? 'ملخص التحليلات' : 'Analytics summary'}</CardTitle>
            <CardDescription>{language === 'ar' ? 'المعدل الفصلي والتراكمي والساعات' : 'Semester & cumulative GPA and credits'}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8 space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="text-center p-3 rounded-2xl bg-background/60">
                <p className="text-2xl font-bold font-display">{Number(analytics?.semester_gpa ?? 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground uppercase">{language === 'ar' ? 'معدل الفصل (4)' : 'Semester GPA'}</p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-background/60">
                <p className="text-2xl font-bold font-display">{Number(analytics?.semester_percent ?? 0).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground uppercase">{language === 'ar' ? 'نسبة الفصل' : 'Semester %'}</p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-background/60">
                <p className="text-2xl font-bold font-display">{Number(analytics?.cgpa ?? 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground uppercase">{language === 'ar' ? 'معدل تراكمي' : 'CGPA'}</p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-background/60">
                <p className="text-2xl font-bold font-display">{Number(analytics?.cumulative_percent ?? 0).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground uppercase">{language === 'ar' ? 'نسبة تراكمية' : 'Cumulative %'}</p>
              </div>
            </div>
            <div className="flex justify-between text-sm border-t pt-4">
              <span className="text-muted-foreground">{language === 'ar' ? 'الساعات المنجزة' : 'Credits completed'}</span>
              <span className="font-bold">{analytics?.credits_completed ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{language === 'ar' ? 'الساعات المحمولة' : 'Credits carried'}</span>
              <span className="font-bold">{analytics?.credits_carried ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{language === 'ar' ? 'الساعات الحالية' : 'Current credits'}</span>
              <span className="font-bold">{analytics?.credits_current ?? 0}</span>
            </div>

            {atRiskCourses.length > 0 && (
              <div className="p-4 rounded-2xl bg-background/50 border border-destructive/20">
                <p className="text-xs leading-relaxed text-muted-foreground flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-destructive" />
                  <span>
                    {language === 'ar'
                      ? `${atRiskCourses.length} مواد تحتاج انتباه خاص`
                      : `${atRiskCourses.length} courses need attention`}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-course analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="rounded-xl sm:rounded-[2rem] border shadow-sm bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-bold text-lg">{course.course_name}</h4>
                  <Badge className={cn('mt-1 rounded-full text-[10px]', getGradeStatusColor(course.status))}>
                    {language === 'ar' ? (STATUS_LABELS[course.status] ?? course.status) : course.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold font-display">{course.final_mark != null ? Number(course.final_mark).toFixed(1) : '—'}%</p>
                  <p className="text-xs text-muted-foreground">{course.letter ?? '—'} · {course.gpa_points != null ? course.gpa_points.toFixed(2) : '—'} {language === 'ar' ? 'نقاط' : 'pts'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('analytics.currentGrade')}</span>
                  <span className="font-bold">{course.final_mark != null ? Number(course.final_mark).toFixed(1) + '%' : 'N/A'}</span>
                </div>
                <Progress value={course.final_mark ?? 0} className="h-2" />
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">{language === 'ar' ? 'الساعات' : 'Credits'}</span>
                  <span className="font-bold">{course.credit_hours ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {courses.length === 0 && (
        <Card className="rounded-xl sm:rounded-[2rem] p-6 sm:p-12 text-center">
          <Info className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {language === 'ar' ? 'أضف مواد ودرجات لرؤية التحليلات' : 'Add courses and grades to see analytics'}
          </p>
        </Card>
      )}
    </div>
  );
}
