import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, Bell, Moon, Sun, Globe, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppSidebar } from './AppSidebar';
import { useLanguage } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageEntrance } from '@/components/ui/PageEntrance';
import { cn } from '@/lib/utils';

const MOBILE_BREAKPOINT = 768;

export function AppLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return t('nav.dashboard');
    if (path.startsWith('/courses')) return t('nav.courses');
    if (path === '/academic-history') return t('nav.academicHistory');
    if (path === '/planner') return t('nav.planner');
    if (path === '/ai-coach') return t('nav.aiConsultant');
    if (path === '/analytics') return t('nav.analytics');
    if (path === '/study-tools') return t('nav.studyTools');
    if (path === '/notes') return t('nav.notes');
    if (path === '/voice-to-text') return t('nav.voiceToText');
    if (path === '/translate-video') return t('nav.translateVideo');
    if (path === '/read-texts') return t('nav.readTexts');
    if (path === '/text-to-video') return t('nav.textToVideo');
    if (path === '/text-to-images') return t('nav.textToImages');
    if (path === '/presentations') return t('nav.presentations');
    if (path === '/infographics') return t('nav.infographics');
    if (path === '/theses') return t('nav.theses');
    if (path === '/user-guide') return t('nav.userGuide');
    if (path === '/code-editor') return t('nav.codeEditor');
    if (path === '/subject-tree') return t('nav.subjectTree');
    if (path === '/admin') return t('nav.admin');
    if (path === '/settings') return t('common.settings');
    return 'UniPilot';
  };

  return (
    <div className="flex h-screen max-h-screen min-h-0 bg-background overflow-hidden">
      {/* Mobile overlay when sidebar open */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
          aria-hidden
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AppSidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobile={isMobile}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-muted/30">
        <header
          className={cn(
            "h-14 sm:h-16 border-b bg-background/80 backdrop-blur-md flex items-center justify-between shrink-0",
            "px-4 sm:px-6 md:px-8 gap-2 sm:gap-4"
          )}
        >
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-full md:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <h1 className="text-base sm:text-xl font-bold font-display truncate">
              {getPageTitle()}
            </h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 sm:h-10 sm:w-10" onClick={toggleLanguage}>
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 sm:h-10 sm:w-10" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative h-9 w-9 sm:h-10 sm:w-10">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 sm:top-1 sm:right-1 sm:w-2 sm:h-2 bg-destructive rounded-full" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 sm:w-80">
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {t('notifications.noNotifications')}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              className="gap-1.5 sm:gap-2 rounded-full border-primary/20 hover:bg-primary/5 transition-all btn-3d hidden sm:flex text-xs sm:text-sm px-3 sm:px-4 h-9 sm:h-10"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              <span className="font-medium hidden sm:inline">AI Insights</span>
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8 custom-scrollbar">
          <PageEntrance pathname={location.pathname} className="max-w-7xl mx-auto w-full">
            {children}
          </PageEntrance>
        </div>
      </main>
    </div>
  );
}
