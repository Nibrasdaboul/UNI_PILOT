import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  FolderTree,
  BookOpen,
  Loader2,
  Clock,
  Lock,
  CheckCircle2,
  Search,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Collapsible } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';

// --- Helpers: build student tree from full catalog (guarantee every course is shown) ---

function normalizeCatalog(catalog) {
  if (Array.isArray(catalog)) return catalog;
  if (catalog && typeof catalog === 'object' && Array.isArray(catalog.data)) return catalog.data;
  return [];
}

function buildCatalogById(list) {
  return list.reduce((acc, c) => {
    const id = Number(c.id);
    if (!Number.isNaN(id)) acc[id] = c;
    return acc;
  }, {});
}

/** Get root catalog id for a course (follow prerequisite_id until null or missing). */
function getRootCatalogId(course, catalogById) {
  const id = Number(course.id);
  if (Number.isNaN(id)) return id;
  const seen = new Set([id]);
  let cur = catalogById[id];
  while (cur && cur.prerequisite_id != null) {
    const pid = Number(cur.prerequisite_id);
    if (seen.has(pid)) break;
    seen.add(pid);
    cur = catalogById[pid];
  }
  return cur ? Number(cur.id) : id;
}

/** Topological order: roots first, then by prerequisite. */
function topologicalOrder(list, catalogById) {
  const result = [];
  const added = new Set();
  let remaining = list.slice();
  while (remaining.length > 0) {
    const next = remaining.filter((c) => {
      const pid = c.prerequisite_id != null ? Number(c.prerequisite_id) : null;
      return pid == null || added.has(pid);
    });
    if (next.length === 0) {
      result.push(...remaining);
      break;
    }
    next.forEach((c) => {
      result.push(c);
      added.add(Number(c.id));
    });
    remaining = remaining.filter((c) => !added.has(Number(c.id)));
  }
  return result;
}

/**
 * Group catalog into chains by root. Every course appears in exactly one group.
 * Returns array of groups, each group = array of courses in topological order.
 */
function buildChainGroups(catalogList) {
  const catalogById = buildCatalogById(catalogList);
  const order = topologicalOrder(catalogList, catalogById);
  const orderIdx = order.reduce((acc, c, i) => { acc[Number(c.id)] = i; return acc; }, {});

  const byRoot = {};
  for (const c of catalogList) {
    const rootId = getRootCatalogId(c, catalogById);
    if (!byRoot[rootId]) byRoot[rootId] = [];
    byRoot[rootId].push(c);
  }

  const groups = Object.values(byRoot).map((group) =>
    group.slice().sort((a, b) => (orderIdx[Number(a.id)] ?? 999) - (orderIdx[Number(b.id)] ?? 999))
  );
  groups.sort((a, b) => (orderIdx[Number(a[0]?.id)] ?? 999) - (orderIdx[Number(b[0]?.id)] ?? 999));

  const inGroups = new Set(groups.flatMap((g) => g.map((c) => Number(c.id))));
  const missing = catalogList.filter((c) => !inGroups.has(Number(c.id)));
  if (missing.length > 0) {
    missing.sort((a, b) => (orderIdx[Number(a.id)] ?? 999) - (orderIdx[Number(b.id)] ?? 999));
    groups.push(missing);
  }

  return groups;
}

/** Get prerequisite chain for a course: from root to this course (in order). */
function getPrerequisiteChain(course, catalogById) {
  const chain = [];
  let cur = course;
  const seen = new Set();
  while (cur) {
    const id = Number(cur.id);
    if (seen.has(id)) break;
    seen.add(id);
    chain.unshift(cur);
    const pid = cur.prerequisite_id != null ? Number(cur.prerequisite_id) : null;
    cur = pid != null ? catalogById[pid] : null;
  }
  return chain;
}

/** Filter catalog by search (course name or code, case-insensitive). */
function filterCatalogBySearch(list, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (c) =>
      (c.course_name && String(c.course_name).toLowerCase().includes(q)) ||
      (c.course_code && String(c.course_code).toLowerCase().includes(q))
  );
}

export default function SubjectTree() {
  const { api, isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const [courses, setCourses] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [modulesByCourse, setModulesByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedCatalog, setExpandedCatalog] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      if (isAdmin) {
        const res = await api.get('/catalog/courses');
        setCatalog(normalizeCatalog(res?.data));
        setCourses([]);
      } else {
        const [coursesRes, catalogRes] = await Promise.all([
          api.get('/student/courses'),
          api.get('/catalog/courses'),
        ]);
        const list = Array.isArray(coursesRes?.data) ? coursesRes.data : [];
        const catalogData = normalizeCatalog(catalogRes?.data);
        setCourses(list);
        setCatalog(catalogData);
        const byCourse = {};
        for (const c of list) {
          try {
            const modRes = await api.get(`/courses/${c.id}/modules`);
            byCourse[c.id] = modRes.data || [];
          } catch {
            byCourse[c.id] = [];
          }
        }
        setModulesByCourse(byCourse);
      }
    } catch (error) {
      console.error('Subject tree error:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const catalogList = normalizeCatalog(catalog);
  const catalogById = buildCatalogById(catalogList);
  const chainGroups = buildChainGroups(catalogList);
  const catalogSorted = topologicalOrder(catalogList, catalogById);
  if (catalogSorted.length === 0 && catalogList.length > 0) {
    catalogSorted.push(...catalogList);
  }
  const searchTrimmed = (searchQuery || '').trim();
  const searchMatches = filterCatalogBySearch(catalogList, searchTrimmed);
  const totalCatalogHours = catalogList.reduce((sum, c) => sum + (Number(c.credit_hours) || 0), 0);
  const enrolledCatalogIds = new Set(
    courses.map((c) => Number(c.catalog_course_id)).filter((id) => !Number.isNaN(id) && id > 0)
  );
  const finalizedCatalogIds = new Set(
    courses
      .filter((c) => c.finalized_at != null || c.finalizedAt != null)
      .map((c) => Number(c.catalog_course_id))
      .filter((id) => !Number.isNaN(id) && id > 0)
  );
  const totalEnrolledHours = courses.reduce((sum, c) => sum + (Number(c.credit_hours) || 0), 0);

  const isUnlocked = (cat) => {
    const prereqId = cat.prerequisite_id != null ? Number(cat.prerequisite_id) : null;
    if (prereqId == null) return true;
    return finalizedCatalogIds.has(prereqId);
  };
  const isEnrolled = (cat) => enrolledCatalogIds.has(Number(cat.id));
  const enrolledCourseByCatalogId = courses.reduce((acc, c) => {
    if (c.catalog_course_id) acc[Number(c.catalog_course_id)] = c;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // --- Admin view (unchanged behavior) ---
  if (isAdmin) {
    return (
      <div className="space-y-6 pb-12" data-testid="subject-tree-page">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FolderTree className="w-5 h-5" />
              </div>
              {language === 'ar' ? 'شجرة المواد' : 'Subject Tree'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {language === 'ar' ? 'شجرة المواد الكاملة (كل الكتالوج)' : 'Full course tree (entire catalog)'}
            </p>
          </div>
          <Badge variant="secondary" className="rounded-full px-4 py-2 text-sm gap-1.5 w-fit">
            <Clock className="w-4 h-4" />
            {t('admin.totalCatalogHours')}: {totalCatalogHours}h
          </Badge>
        </div>
        <div className="flex gap-2 items-center max-w-md w-full">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <Input
            placeholder={language === 'ar' ? 'بحث باسم المادة أو الرمز...' : 'Search by course name or code...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl flex-1"
          />
        </div>
        {searchTrimmed && searchMatches.length > 0 && (
          <Card className="rounded-2xl border shadow-sm overflow-hidden bg-card/50">
            <CardHeader className="border-b bg-muted/20 px-6 py-4">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                {language === 'ar' ? 'نتائج البحث' : 'Search results'} ({searchMatches.length})
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'سلسلة المادة ومتطلباتها السابقة' : 'Course chain and prerequisites'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {searchMatches.map((course) => {
                const chain = getPrerequisiteChain(course, catalogById);
                return (
                  <div key={course.id} className="rounded-xl border border-border/50 overflow-hidden">
                    <p className="text-xs font-medium text-muted-foreground px-4 py-2 bg-muted/30 border-b">
                      {language === 'ar' ? 'سلسلة المتطلبات السابقة' : 'Prerequisite chain'}
                    </p>
                    <div className="p-4 space-y-2">
                      {chain.map((c, i) => (
                        <div key={c.id} className="flex items-center gap-2">
                          {i > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <Badge variant="secondary" className="rounded-full text-xs">{c.course_code}</Badge>
                          <span className={c.id === course.id ? 'font-semibold' : 'text-muted-foreground'}>{c.course_name}</span>
                          <span className="text-xs text-muted-foreground">({c.credit_hours ?? 0}h)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
        {searchTrimmed && searchMatches.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'لا توجد مواد تطابق البحث.' : 'No courses match your search.'}
          </p>
        )}
        <Card className="rounded-2xl sm:rounded-[2rem] border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b bg-muted/20 px-6 py-6">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {language === 'ar' ? 'المنهج الكامل' : 'Full curriculum'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'ترتيب المواد حسب المتطلبات السابقة' : 'Courses ordered by prerequisites'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {catalogSorted.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">
                  {language === 'ar' ? 'لا توجد مواد في الكتالوج' : 'No courses in catalog'}
                </p>
              </div>
            ) : (
              <Collapsible open={expandedCatalog} onOpenChange={setExpandedCatalog}>
                <div className="space-y-1">
                  {catalogSorted.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center gap-3 py-2.5 px-4 rounded-xl border border-border/50 hover:bg-muted/30"
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Badge variant="secondary" className="rounded-full text-xs shrink-0">
                        {course.course_code}
                      </Badge>
                      <span className="font-medium flex-1">{course.course_name}</span>
                      <span className="text-sm text-muted-foreground">{course.credit_hours ?? 0}h</span>
                    </div>
                  ))}
                </div>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Student view: full catalog in cards (chains + standalone), every course shown ---
  return (
    <div className="space-y-6 pb-12" data-testid="subject-tree-page" ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FolderTree className="w-5 h-5" />
            </div>
            {language === 'ar' ? 'شجرة المواد' : 'Subject Tree'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {language === 'ar'
              ? 'المادة التالية تفتح بعد إنهاء المتطلب السابق (زر انتهى وإدخال العلامات)'
              : 'Next course unlocks after you finish the prerequisite (Mark finished + enter grades)'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:max-w-md">
          <div className="flex gap-2 items-center flex-1 min-w-0">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <Input
              placeholder={language === 'ar' ? 'بحث باسم المادة أو الرمز...' : 'Search by course name or code...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl flex-1 min-w-0"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default" className="rounded-full px-4 py-2 text-sm gap-1.5">
            <Clock className="w-4 h-4" />
            {t('courses.totalEnrolledHours')}: {totalEnrolledHours}h
          </Badge>
          <Badge variant="outline" className="rounded-full px-4 py-2 text-sm gap-1.5">
            {t('courses.totalCatalogHours')}: {totalCatalogHours}h
          </Badge>
          {catalogList.length > 0 && (
            <Badge variant="secondary" className="rounded-full px-4 py-2 text-sm gap-1.5">
              {language === 'ar' ? 'عدد المواد' : 'Courses'}: {catalogList.length}
            </Badge>
          )}
        </div>
      </div>

      {searchTrimmed && searchMatches.length > 0 && (
        <Card className="rounded-2xl border shadow-sm overflow-hidden bg-card/50">
          <CardHeader className="border-b bg-muted/20 px-6 py-4">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              {language === 'ar' ? 'نتائج البحث' : 'Search results'} ({searchMatches.length})
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'سلسلة المادة ومتطلباتها السابقة' : 'Course chain and prerequisites'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {searchMatches.map((course) => {
              const chain = getPrerequisiteChain(course, catalogById);
              return (
                <div key={course.id} className="rounded-xl border border-border/50 overflow-hidden">
                  <p className="text-xs font-medium text-muted-foreground px-4 py-2 bg-muted/30 border-b">
                    {language === 'ar' ? 'سلسلة المتطلبات السابقة' : 'Prerequisite chain'}
                  </p>
                  <div className="p-4 space-y-3">
                    {chain.map((c, i) => {
                      const unlocked = isUnlocked(c);
                      const enrolled = isEnrolled(c);
                      const locked = !unlocked && !enrolled;
                      const studentCourse = enrolledCourseByCatalogId[Number(c.id)];
                      return (
                        <div key={c.id} className="flex items-center gap-2 flex-wrap">
                          {i > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <Badge variant="secondary" className="rounded-full text-xs">{c.course_code}</Badge>
                          <span className={c.id === course.id ? 'font-semibold' : locked ? 'text-muted-foreground' : ''}>{c.course_name}</span>
                          <span className="text-xs text-muted-foreground">({c.credit_hours ?? 0}h)</span>
                          {locked && <Badge variant="outline" className="rounded-full text-xs">{language === 'ar' ? 'مقفل' : 'Locked'}</Badge>}
                          {enrolled && studentCourse && (
                            <Link to={`/courses/${studentCourse.id}`} className="text-sm text-primary hover:underline">→ {language === 'ar' ? 'فتح' : 'Open'}</Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      {searchTrimmed && searchMatches.length === 0 && catalogList.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {language === 'ar' ? 'لا توجد مواد تطابق البحث.' : 'No courses match your search.'}
        </p>
      )}

      {catalogList.length === 0 ? (
        <Card className="rounded-2xl sm:rounded-[2rem] border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">
              {language === 'ar' ? 'لا توجد مواد في الكتالوج' : 'No courses in catalog'}
            </p>
            <p className="text-sm mt-1">
              {language === 'ar' ? 'الأدمن يضيف المواد من لوحة الإدارة' : 'Admin adds courses from Admin Panel'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {chainGroups.map((group, groupIdx) => (
            <Card
              key={groupIdx}
              className="rounded-2xl sm:rounded-[2rem] border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm"
            >
              <CardHeader className="border-b bg-muted/20 px-6 py-4">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-primary" />
                  {group.length === 1
                    ? (language === 'ar' ? 'مادة بدون متطلب سابق' : 'Standalone course')
                    : (language === 'ar' ? `سلسلة مواد (${group.length})` : `Course chain (${group.length})`)}
                </CardTitle>
                <CardDescription>
                  {group.length === 1
                    ? (language === 'ar' ? 'مادة يمكن تسجيلها مباشرة' : 'Course available to enroll directly')
                    : (language === 'ar' ? 'الترتيب حسب المتطلبات السابقة' : 'Ordered by prerequisites')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative">
                  <div
                    className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent rounded-full"
                    aria-hidden
                  />
                  <div className="space-y-4">
                    {group.map((cat, idx) => {
                      const unlocked = isUnlocked(cat);
                      const enrolled = isEnrolled(cat);
                      const studentCourse = enrolledCourseByCatalogId[Number(cat.id)];
                      const locked = !unlocked && !enrolled;
                      return (
                        <div
                          key={cat.id ?? `g${groupIdx}-${idx}`}
                          className="relative flex items-stretch gap-4 pl-4"
                        >
                          <div className="absolute left-0 top-6 w-4 h-4 rounded-full border-2 border-background bg-primary/20 shrink-0 z-10" />
                          <Card
                            className={cn(
                              'flex-1 transition-all duration-300 ease-out overflow-hidden',
                              'hover:shadow-lg hover:scale-[1.01] hover:z-10',
                              locked && 'opacity-70 border-dashed pointer-events-none',
                              enrolled && 'border-primary/30 bg-primary/5 shadow-sm',
                              !locked && 'hover:border-primary/40'
                            )}
                          >
                            <CardContent className="p-4 flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-2 shrink-0">
                                {locked ? (
                                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                                    <Lock className="w-5 h-5" />
                                  </div>
                                ) : enrolled ? (
                                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                                    <CheckCircle2 className="w-5 h-5" />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                                    <BookOpen className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <Badge variant="secondary" className="rounded-full text-xs mb-1">
                                  {cat.course_code}
                                </Badge>
                                <p className="font-semibold text-foreground">{cat.course_name}</p>
                                <p className="text-xs text-muted-foreground">{cat.credit_hours ?? 0}h</p>
                              </div>
                              {locked && (
                                <Badge variant="outline" className="rounded-full text-xs shrink-0">
                                  {language === 'ar' ? 'مقفل' : 'Locked'}
                                </Badge>
                              )}
                              {enrolled && studentCourse && (
                                <Link
                                  to={`/courses/${studentCourse.id}`}
                                  className="shrink-0 text-sm font-medium text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {language === 'ar' ? 'فتح' : 'Open'} →
                                </Link>
                              )}
                              {unlocked && !enrolled && (
                                <Link
                                  to="/courses"
                                  className="shrink-0 text-sm font-medium text-primary hover:underline"
                                >
                                  {language === 'ar' ? 'تسجيل من صفحة المواد' : 'Enroll from Courses'}
                                </Link>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
