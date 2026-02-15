import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Calendar,
  BarChart3,
  Sparkles,
  BookOpen,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Settings,
  Shield,
  X,
  FolderTree,
  Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

export function AppSidebar({ isCollapsed, setIsCollapsed, isMobile, open, onClose }) {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { t, language } = useLanguage();

  const navItems = [
    { title: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { title: t('nav.courses'), href: '/courses', icon: GraduationCap },
    { title: t('nav.planner'), href: '/planner', icon: Calendar },
    { title: t('nav.aiConsultant'), href: '/ai-coach', icon: MessageSquare },
    { title: t('nav.analytics'), href: '/analytics', icon: BarChart3 },
    { title: t('nav.studyTools'), href: '/study-tools', icon: Sparkles },
    { title: t('nav.notes'), href: '/notes', icon: BookOpen },
    { title: t('nav.subjectTree'), href: '/subject-tree', icon: FolderTree },
    { title: t('nav.voiceToText'), href: '/voice-to-text', icon: Mic },
  ];

  if (isAdmin) {
    navItems.push({ title: t('nav.admin'), href: '/admin', icon: Shield });
  }

  const sidebarContent = (
    <>
      <div className="flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 border-b">
        {!isCollapsed && (
          <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-display tracking-tight">
            UniPilot
          </span>
        )}
        {isCollapsed && !isMobile && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shrink-0">
            U
          </div>
        )}
        {isMobile && (
          <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={onClose} aria-label="Close menu">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <nav 
        className={cn(
          "flex-1 overflow-y-auto py-4 sm:py-6 px-3 space-y-1 custom-scrollbar sidebar-nav",
          isMobile && (open ? "sidebar-revealed" : "sidebar-closing"),
          !isMobile && !isCollapsed && "sidebar-revealed",
          !isMobile && isCollapsed && "sidebar-closing"
        )}
        data-revealed={isMobile ? open : !isCollapsed}
      >
        {navItems.map((item, i) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={isMobile ? onClose : undefined}
              className={cn(
                "sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group btn-3d",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              style={{ ['--stagger-index']: i }}
            >
              <item.icon
                className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "group-hover:text-primary")}
              />
              <span className="font-medium truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 sm:p-4 border-t space-y-2">
        {!isCollapsed && user && (
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border shrink-0">
              <span className="text-sm font-medium text-primary">{user.full_name?.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{user.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
        <Link to="/settings" onClick={isMobile ? onClose : undefined}>
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-10">
            <Settings className="w-5 h-5 shrink-0" />
            <span className="font-medium">{t('common.settings')}</span>
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 rounded-xl hover:bg-destructive/10 hover:text-destructive h-10"
          onClick={logout}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="font-medium">{t('common.logout')}</span>
        </Button>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-20 h-6 w-6 rounded-full border bg-background shadow-sm z-10",
              language === 'ar' ? "-left-3" : "-right-3"
            )}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              language === 'ar' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              language === 'ar' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <aside
        className={cn(
          "fixed top-0 z-50 flex flex-col h-full w-72 max-w-[85vw] bg-card border-r panel-3d transition-transform duration-300 ease-out",
          language === 'ar' ? "right-0 border-l border-r-0" : "left-0",
          open ? "translate-x-0" : language === 'ar' ? "translate-x-full" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        {sidebarContent}
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r bg-card transition-all duration-300 ease-in-out h-full panel-3d shrink-0",
        isCollapsed ? "w-20" : "w-56 sm:w-64",
        language === 'ar' ? "border-l border-r-0" : ""
      )}
    >
      {sidebarContent}
    </aside>
  );
}
