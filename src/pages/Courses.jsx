import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Search, 
  MoreVertical, 
  Users, 
  Calendar, 
  ArrowUpRight,
  TrendingUp,
  Trash2,
  Lock,
  Clock,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { cn, getGradeColor, getGradeStatus, getGradeStatusColor } from '@/lib/utils';
import { toast } from 'sonner';

export default function Courses() {
  const { api } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [enrollingId, setEnrollingId] = useState(null);
  const [courseResourcesMap, setCourseResourcesMap] = useState({});

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (!Array.isArray(courses) || courses.length === 0) {
      setCourseResourcesMap({});
      return;
    }
    (async () => {
      const map = {};
      await Promise.all(
        courses.map(async (c) => {
          try {
            const res = await api.get(`/courses/${c.id}/resources`);
            map[c.id] = Array.isArray(res?.data) ? res.data : [];
          } catch (_) {
            map[c.id] = [];
          }
        })
      );
      setCourseResourcesMap(map);
    })();
  }, [courses, api]);

  const fetchCourses = async () => {
    try {
      const [coursesRes, catalogRes] = await Promise.all([
        api.get('/student/courses'),
        api.get('/catalog/courses').catch(() => ({ data: [] })),
      ]);
      const coursesList = coursesRes?.data;
      const catalogList = catalogRes?.data;
      setCourses(Array.isArray(coursesList) ? coursesList : []);
      setCatalog(Array.isArray(catalogList) ? catalogList : []);
    } catch (error) {
      console.error('Courses error:', error);
      toast.error(t('common.error'));
      setCourses([]);
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  };

  const catalogSorted = Array.isArray(catalog) ? [...catalog].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : [];
  const coursesList = Array.isArray(courses) ? courses : [];
  const enrolledCatalogIds = new Set(
    coursesList.map((c) => Number(c.catalog_course_id)).filter((id) => !Number.isNaN(id) && id > 0)
  );
  const finalizedCatalogIds = new Set(
    coursesList
      .filter((c) => c.finalized_at != null || c.finalizedAt != null)
      .map((c) => Number(c.catalog_course_id))
      .filter((id) => !Number.isNaN(id) && id > 0)
  );
  const canEnroll = (catalogCourse) => {
    const catId = Number(catalogCourse.id);
    if (!catId) return false;
    if (enrolledCatalogIds.has(catId)) return false;
    const prereqId = catalogCourse.prerequisite_id != null ? Number(catalogCourse.prerequisite_id) : null;
    if (prereqId == null) return true;
    return finalizedCatalogIds.has(prereqId);
  };

  const handleEnrollFromCatalog = async (cat) => {
    setEnrollingId(cat.id);
    try {
      await api.post('/student/courses', {
        course_name: cat.course_name,
        course_code: cat.course_code,
        credit_hours: cat.credit_hours ?? 3,
        catalog_course_id: cat.id,
        semester: 'Spring 2026',
        difficulty: 5,
        target_grade: 85,
        professor_name: '',
        description: cat.description || '',
      });
      toast.success(language === 'ar' ? 'تم تسجيل المادة' : 'Course enrolled');
      fetchCourses();
    } catch (error) {
      const detail = error.response?.data?.detail;
      const isPrereqNotFinished = typeof detail === 'string' && (detail.includes('prerequisite') || detail.includes('Complete the'));
      const msg = isPrereqNotFinished
        ? (language === 'ar' ? 'أنهِ المتطلب السابق أولاً: ادخل العلامات واضغط انتهى ثم سجّل هذه المادة' : detail)
        : (detail || t('common.error'));
      toast.error(msg);
    } finally {
      setEnrollingId(null);
    }
  };

  const totalEnrolledHours = (Array.isArray(courses) ? courses : []).reduce((sum, c) => sum + (c.credit_hours ?? 0), 0);
  const totalCatalogHours = (Array.isArray(catalog) ? catalog : []).reduce((sum, c) => sum + (c.credit_hours ?? 0), 0);

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه المادة؟' : 'Are you sure you want to delete this course?')) return;
    try {
      await api.delete(`/student/courses/${courseId}`);
      toast.success(language === 'ar' ? 'تم حذف المادة' : 'Course deleted');
      fetchCourses();
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const filteredCourses = (Array.isArray(courses) ? courses : []).filter(c => 
    (c.course_name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.course_code || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse h-80 rounded-[2rem]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12" data-testid="courses-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">
            {t('courses.title')}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {language === 'ar' ? 'اختر موادك من مقررات الجامعة المتاحة أدناه' : 'Choose your courses from the available university catalog below'}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="default" className="rounded-full px-3 py-1 gap-1">
              <Clock className="w-3 h-3" />
              {t('courses.totalEnrolledHours')}: {totalEnrolledHours}h
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 gap-1">
              {t('courses.totalCatalogHours')}: {totalCatalogHours}h
            </Badge>
          </div>
        </div>
        <div className="relative w-full sm:w-64 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:left-auto rtl:right-3" />
            <Input 
              placeholder={t('courses.searchPlaceholder')}
              className="pl-10 rtl:pl-3 rtl:pr-10 rounded-xl bg-background border-primary/10 h-11 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="courses-search"
            />
          </div>
      </div>

      {/* Available courses (from catalog) - enroll with prerequisite */}
      {catalogSorted.length > 0 && (
        <Card className="rounded-2xl sm:rounded-[2rem] border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b bg-muted/20 px-6 py-6">
            <CardTitle className="text-lg font-display">{t('courses.availableCourses')}</CardTitle>
            <CardDescription>
              {language === 'ar' ? 'اختر المواد حسب ترتيب الشجرة. المادة التالية تفتح بعد إنهاء المتطلب السابق (زر انتهى + إدخال العلامات).' : 'Choose courses in tree order. The next course unlocks after you finish the prerequisite (Mark finished + enter grades).'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogSorted.map((cat, idx) => {
                const alreadyEnrolled = enrolledCatalogIds.has(Number(cat.id));
                const unlocked = canEnroll(cat);
                return (
                  <Card key={cat.id ?? `cat-${idx}`} className={cn(
                    'rounded-2xl overflow-hidden',
                    !unlocked && !alreadyEnrolled && 'opacity-75 border-dashed'
                  )}>
                    <CardContent className="p-4 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Badge variant="secondary" className="rounded-full text-xs mb-2">{cat.course_code}</Badge>
                        <h4 className="font-bold">{cat.course_name}</h4>
                        <p className="text-sm text-muted-foreground">{cat.department}</p>
                        <p className="text-xs text-muted-foreground mt-1">{cat.credit_hours ?? 0}h</p>
                      </div>
                      <div className="shrink-0">
                        {alreadyEnrolled ? (
                          <Badge variant="default" className="rounded-full">{language === 'ar' ? 'مسجل' : 'Enrolled'}</Badge>
                        ) : !unlocked ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground" title={language === 'ar' ? 'أنهِ المتطلب السابق: ادخل العلامات واضغط انتهى' : 'Finish the prerequisite: enter grades and click Mark finished'}>
                            <Lock className="w-4 h-4" />
                            {language === 'ar' ? 'مقفل' : 'Locked'}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            className="rounded-xl"
                            disabled={enrollingId !== null}
                            onClick={() => handleEnrollFromCatalog(cat)}
                          >
                            {enrollingId === cat.id ? '...' : t('courses.enroll')}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-xl font-bold font-display mb-4">
          {language === 'ar' ? 'موادي المسجلة' : 'My enrolled courses'}
        </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <Card key={course.id} className="rounded-[2rem] border shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden bg-card/50 backdrop-blur-sm" data-testid={`course-card-${course.id}`}>
            <CardHeader className="p-8 pb-4">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/courses/${course.id}`)}>
                      {t('common.viewAll')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteCourse(course.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('common.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full text-[10px] font-bold tracking-widest uppercase py-0.5 px-2">
                    {course.course_code || 'N/A'}
                  </Badge>
                  <span className="text-xs font-bold text-muted-foreground">• {course.credit_hours ?? 0} {t('courses.credits')}</span>
                </div>
                <CardTitle className="text-xl font-display group-hover:text-primary transition-colors">{course.course_name}</CardTitle>
                {course.professor_name && (
                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {course.professor_name}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-8 py-4 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('courses.currentGrade')}</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn(
                      "text-2xl font-bold font-display",
                      course.current_grade != null ? getGradeColor(course.current_grade) : "text-muted-foreground"
                    )}>
                      {course.current_grade != null ? `${Number(course.current_grade).toFixed(1)}%` : 'N/A'}
                    </span>
                    {course.current_grade != null && (
                      <Badge className={cn("rounded-full text-[10px]", getGradeStatusColor(getGradeStatus(course.current_grade)))}>
                        {language === 'ar'
                          ? (getGradeStatus(course.current_grade) === 'safe' ? 'آمن' : getGradeStatus(course.current_grade) === 'normal' ? 'وضع عادي' : getGradeStatus(course.current_grade) === 'at_risk' ? 'خطر' : 'خطر عالي')
                          : getGradeStatus(course.current_grade)}
                      </Badge>
                    )}
                  </div>
                </div>
                <Progress value={course.current_grade ?? 0} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-2xl bg-muted/50 border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{t('courses.difficulty')}</p>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-bold">{course.difficulty}/10</span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-muted/50 border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{t('courses.targetGrade')}</p>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-secondary" />
                    <span className="text-sm font-bold">{course.target_grade || 85}%</span>
                  </div>
                </div>
              </div>

              {(courseResourcesMap[course.id]?.length > 0) && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {language === 'ar' ? 'ملفات المادة' : 'Course files'}
                  </p>
                  <ul className="space-y-1">
                    {courseResourcesMap[course.id].map((r) => (
                      <li key={r.id}>
                        <a
                          href={r.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline py-1 rounded-lg hover:bg-muted/50 px-2 -mx-2"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate flex-1">{r.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter className="px-8 pb-8 pt-0">
              <Button 
                variant="outline" 
                className="w-full rounded-xl gap-2 font-bold hover:bg-primary/5 hover:border-primary/30 transition-all"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                {t('courses.courseDashboard')} <ArrowUpRight className="w-4 h-4 rtl-flip" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      </div>
    </div>
  );
}
