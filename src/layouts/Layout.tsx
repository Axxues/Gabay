import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLMS } from '@/contexts/LMSContext';
import { AppRail } from '@/layouts/AppRail';
import { LMSContextPanel } from '@/layouts/LMSContextPanel';
import { Topbar } from '@/layouts/Topbar';
import { SpeedGraderModal } from '@/components/grading/SpeedGraderModal';
import { RoleSwitcherModal } from '@/components/shared/RoleSwitcherModal';
import { GlobalSearchDialog } from '@/components/shared/GlobalSearchDialog';
import { PageTransition } from '@/components/shared/PageTransition';
import { AppSkeleton } from '@/components/shared/AppSkeleton';
import { tabToPath, courseToPath, pathToTab } from '@/constants/routes';

export function useAppNavigation() {
  const navigate = useNavigate();
  const { activeCourseId, setActiveCourseId, logHistory } = useLMS();

  const handleNavigateTab = (tab: string) => {
    if (tab === 'edit-account') {
      navigate('/accounts');
      logHistory('/accounts', 'LMS > Edit Account');
      return;
    }
    const path = tabToPath(tab, activeCourseId);
    navigate(path);
    logHistory(path, `LMS > ${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
  };

  const handleNavigateCourse = (courseId: string, subTab = 'modules') => {
    setActiveCourseId(courseId);
    const path = courseToPath(courseId, subTab);
    navigate(path);
    logHistory(path, `LMS > Course > ${subTab}`);
  };

  const handleSelectCourseTab = (subTab: string) => {
    if (activeCourseId) {
      handleNavigateCourse(activeCourseId, subTab);
    }
  };

  const handleEditAccount = (user: { id: string }) => {
    const path = `/accounts/${encodeURIComponent(user.id)}/edit`;
    navigate(path);
    logHistory(path, 'LMS > Edit Account');
  };

  return { handleNavigateTab, handleNavigateCourse, handleSelectCourseTab, handleEditAccount };
}

export const Layout: React.FC = () => {
  const location = useLocation();
  const { activeCourseId, setActiveCourseId, isLoading, activeRole, isAuthenticated } = useLMS();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const parsed = pathToTab(location.pathname);
  const currentTab = parsed.tab === 'login' ? 'dashboard' : parsed.tab;
  const courseSubTab = parsed.subTab ?? 'modules';

  // Keep context activeCourseId in sync with the URL so refresh / deep-link / back-forward restore the course.
  useEffect(() => {
    if (parsed.courseId && parsed.courseId !== activeCourseId) {
      setActiveCourseId(parsed.courseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.courseId]);

  const nav = useAppNavigation();

  // Role-based guard (preserves previous auto-guard behavior, now URL-driven).
  const navigate = useNavigate();
  useEffect(() => {
    if (activeRole === 'staff') {
      const allowedStaffTabs = ['inbox', 'calendar', 'gabay-rag', 'history', 'help', 'profile'];
      if (!allowedStaffTabs.includes(currentTab)) {
        navigate('/inbox', { replace: true });
      }
    } else if (activeRole !== 'admin') {
      if (currentTab === 'accounts' || currentTab === 'create-account' || currentTab === 'edit-account') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [activeRole, currentTab, navigate]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K opens search dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isAuthenticated && isLoading) {
    return <AppSkeleton />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-muted font-sans selection:bg-primary/20 dark:bg-background">
      <Topbar
        currentTab={currentTab}
        onNavigateTab={nav.handleNavigateTab}
        onNavigateCourse={nav.handleNavigateCourse}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden pt-16">
        {sidebarOpen && (
          <div
            className="fixed inset-0 overlay-backdrop z-10 lg:hidden transition-opacity animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="hidden lg:flex"><AppRail currentTab={currentTab} onNavigateTab={nav.handleNavigateTab} /><LMSContextPanel currentTab={currentTab} courseSubTab={courseSubTab} onNavigateTab={nav.handleNavigateTab} onSelectCourseTab={nav.handleSelectCourseTab} onNavigateCourse={nav.handleNavigateCourse} /></div>
        {sidebarOpen && <div className="fixed left-0 top-16 bottom-0 z-20 flex lg:hidden animate-slide-in-right"><AppRail currentTab={currentTab} onNavigateTab={(t) => { nav.handleNavigateTab(t); setSidebarOpen(false); }} /><LMSContextPanel currentTab={currentTab} courseSubTab={courseSubTab} onNavigateTab={(t) => { nav.handleNavigateTab(t); setSidebarOpen(false); }} onSelectCourseTab={(t) => { nav.handleSelectCourseTab(t); setSidebarOpen(false); }} onNavigateCourse={(id, sub) => { nav.handleNavigateCourse(id, sub); setSidebarOpen(false); }} /></div>}

        <main className={`relative min-h-0 min-w-0 w-full flex-1 ${currentTab === 'courses' || currentTab === 'inbox' || currentTab === 'gabay-rag' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto custom-scrollbar'}`}>
          <div className={currentTab === 'courses' || currentTab === 'inbox' || currentTab === 'gabay-rag' ? "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col" : "mx-auto flex min-h-full w-full max-w-[1600px] flex-col p-5 sm:p-8 lg:p-10"}>
            <PageTransition pageKey={location.pathname} className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
              <Outlet context={nav} />
            </PageTransition>
          </div>
        </main>
      </div>

      <GlobalSearchDialog
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigateCourse={(id: string, sub?: string) => { nav.handleNavigateCourse(id, sub); setSearchOpen(false); }}
        onNavigateTab={(t: string) => { nav.handleNavigateTab(t); setSearchOpen(false); }}
      />
      <RoleSwitcherModal />
      <SpeedGraderModal />
    </div>
  );
};
