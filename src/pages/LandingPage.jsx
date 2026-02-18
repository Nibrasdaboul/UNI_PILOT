import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ShieldCheck, Zap, LayoutDashboard, Calendar, BarChart3, GraduationCap, Globe, Moon, Sun, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { toast } from 'sonner';

export default function LandingPage() {
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Navbar */}
      <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shrink-0">
              U
            </div>
            <span className="text-lg sm:text-xl font-bold font-display tracking-tight truncate">UniPilot</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 sm:h-10 sm:w-10 btn-3d" onClick={toggleLanguage}>
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 sm:h-10 sm:w-10 btn-3d" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </Button>
            <Button variant="ghost" className="rounded-full text-sm sm:text-base btn-3d h-9 sm:h-10 px-3 sm:px-4" onClick={() => { setShowAuth(true); setIsLogin(true); }}>
              {t('common.login')}
            </Button>
            <Button className="rounded-full shadow-lg shadow-primary/20 btn-3d text-sm sm:text-base h-9 sm:h-10 px-4 sm:px-6" onClick={() => { setShowAuth(true); setIsLogin(false); }}>
              {t('common.register')}
            </Button>
          </div>
        </div>
      </nav>

      {showAuth ? (
        <AuthForm isLogin={isLogin} setIsLogin={setIsLogin} setShowAuth={setShowAuth} />
      ) : (
        <>
          {/* Hero */}
          <section className="py-12 sm:py-20 md:py-24 px-4 sm:px-6 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-20">
              <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-primary blur-[100px] sm:blur-[128px] rounded-full" />
              <div className="absolute bottom-0 left-0 w-64 sm:w-96 h-64 sm:h-96 bg-secondary blur-[100px] sm:blur-[128px] rounded-full" />
            </div>

            <div className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-xs sm:text-sm border border-primary/20" data-aos="fade-up">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{language === 'ar' ? 'مستقبل إنتاجية الطلاب' : 'The Future of Student Productivity'}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold font-display tracking-tight leading-tight" data-aos="fade-up" data-aos-delay="100">
                {language === 'ar' ? (
                  <>
                    حياتك الأكاديمية <br />
                    <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">بقوة فائقة.</span>
                  </>
                ) : (
                  <>
                    Your Academic Life, <br />
                    <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Supercharged.</span>
                  </>
                )}
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed px-1" data-aos="fade-up" data-aos-delay="200">
                {language === 'ar'
                  ? 'يوني بايلوت هو رفيقك الجامعي المتكامل. أدر موادك، حسّن جدولك، وتفوق في امتحاناتك برؤى ذكية مخصصة.'
                  : 'UniPilot is your all-in-one campus companion. Manage courses, optimize schedules, and ace your exams with personalized AI insights.'
                }
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2" data-aos="fade-up" data-aos-delay="300">
                <Button size="lg" className="h-12 sm:h-14 px-6 sm:px-8 rounded-full text-base sm:text-lg font-semibold gap-2 shadow-xl shadow-primary/25 btn-3d" onClick={() => { setShowAuth(true); setIsLogin(false); }}>
                  {language === 'ar' ? 'ابدأ رحلتك' : 'Start Your Journey'} <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 rtl-flip" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 sm:h-14 px-6 sm:px-8 rounded-full text-base sm:text-lg font-semibold bg-background btn-3d" onClick={() => { setShowAuth(true); setIsLogin(true); }}>
                  {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                </Button>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 border-t bg-muted/20">
            <div className="max-w-7xl mx-auto space-y-10 sm:space-y-16">
              <div className="text-center space-y-4" data-aos="fade-up">
                <h2 className="text-4xl font-bold font-display">
                  {language === 'ar' ? 'مصمم للنجاح' : 'Engineered for Success'}
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  {language === 'ar' 
                    ? 'كل ما يحتاجه الطالب، في لوحة تحكم واحدة مدعومة بأحدث تقنيات الذكاء الاصطناعي.'
                    : 'Everything a student needs, in one single dashboard powered by cutting-edge AI.'
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                <FeatureCard 
                  index={0}
                  icon={LayoutDashboard}
                  title={language === 'ar' ? 'لوحة تحكم ذكية' : 'Smart Dashboard'}
                  description={language === 'ar' 
                    ? 'نظرة شاملة على أدائك الأكاديمي والمواعيد القادمة والمهام ذات الأولوية.'
                    : "A bird's eye view of your academic performance, upcoming deadlines, and priority tasks."
                  }
                />
                <FeatureCard 
                  index={1}
                  icon={Sparkles}
                  title={language === 'ar' ? 'أستاذ AI' : 'AI Professor'}
                  description={language === 'ar'
                    ? 'احصل على إجابات فورية وخطط دراسية وتوقعات درجات مخصصة لأدائك.'
                    : 'Get instant answers, study plans, and grade predictions tailored to your performance.'
                  }
                />
                <FeatureCard 
                  index={2}
                  icon={Calendar}
                  title={language === 'ar' ? 'مخطط ديناميكي' : 'Dynamic Planner'}
                  description={language === 'ar'
                    ? 'جدولة مدعومة بالذكاء الاصطناعي تتكيف مع المواعيد الجديدة وتحسن جلسات دراستك.'
                    : 'AI-driven scheduling that adapts to new deadlines and optimizes your study sessions.'
                  }
                />
                <FeatureCard 
                  index={3}
                  icon={BarChart3}
                  title={language === 'ar' ? 'تحليلات تنبؤية' : 'Predictive Analytics'}
                  description={language === 'ar'
                    ? 'تتبع تقدمك واحصل على تنبيهات قبل انخفاض الأداء. ابق متقدماً.'
                    : 'Track your progress and get alerts before performance dips. Stay ahead of the curve.'
                  }
                />
                <FeatureCard 
                  index={4}
                  icon={Zap}
                  title={language === 'ar' ? 'أدوات الدراسة' : 'Study Tools'}
                  description={language === 'ar'
                    ? 'أنشئ ملخصات وبطاقات تعليمية واختبارات تدريبية في ثوانٍ من ملاحظاتك.'
                    : 'Generate summaries, flashcards, and practice quizzes in seconds from your notes.'
                  }
                />
                <FeatureCard 
                  index={5}
                  icon={ShieldCheck}
                  title={language === 'ar' ? 'مركز الجامعة' : 'Campus Hub'}
                  description={language === 'ar'
                    ? 'تعاون في المشاريع، أدر الاجتماعات، وتابع كل مهمة بسهولة.'
                    : 'Collaborate on projects, manage meetings, and track every delivery with ease.'
                  }
                />
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-12 border-t text-center text-muted-foreground">
            <p>© 2026 UniPilot. {language === 'ar' ? 'تمكين الجيل القادم من العلماء.' : 'Empowering the next generation of scholars.'}</p>
          </footer>
        </>
      )}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, index = 0 }) {
  return (
    <div 
      className="p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border bg-card hover:border-primary/50 transition-all duration-300 group hover:shadow-2xl hover:shadow-primary/5"
      data-aos="fade-up"
      data-aos-delay={index * 80}
    >
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary transition-colors">
        <Icon className="w-6 h-6 text-primary group-hover:text-white" />
      </div>
      <h3 className="text-xl font-bold mb-3 font-display">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function AuthForm({ isLogin, setIsLogin, setShowAuth }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.email, formData.password, formData.fullName);
      }
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <Card className="w-full max-w-md rounded-3xl border shadow-2xl mx-auto">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold mx-auto mb-2">
            U
          </div>
          <CardTitle className="text-2xl font-display">
            {isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}
          </CardTitle>
          <CardDescription>
            {isLogin ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                <Input 
                  id="fullName" 
                  placeholder={language === 'ar' ? 'أحمد محمد' : 'John Doe'}
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required={!isLogin}
                  className="rounded-xl h-12"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="rounded-xl h-12 pe-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 -translate-y-1/2 end-1 h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? (language === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password') : (language === 'ar' ? 'إظهار كلمة المرور' : 'Show password')}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl font-semibold text-base" disabled={loading}>
              {loading ? t('common.loading') : (isLogin ? t('auth.loginButton') : t('auth.registerButton'))}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
            </span>
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-primary font-semibold hover:underline"
            >
              {isLogin ? t('common.register') : t('common.login')}
            </button>
          </div>
          
          <div className="mt-4 text-center">
            <button 
              onClick={() => setShowAuth(false)} 
              className="text-muted-foreground text-sm hover:text-foreground"
            >
              {t('common.back')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
