import React, { useContext } from 'react';
import { LayoutDashboard, BookOpen, Calendar, Inbox, History, HelpCircle, Building, BarChart3, FileCheck2, Users, LogOut, GraduationCap, Sparkles } from 'lucide-react';
import { useLMS } from '@/contexts/LMSContext';
import { GabayChatContext } from '@/contexts/GabayChatContext';
import { MAIN_NAV, isVisible, type NavIcon } from '@/constants/navigation';

const ICONS: Record<NavIcon, React.ReactNode> = {
  dashboard: <LayoutDashboard className="h-5 w-5" />, courses: <BookOpen className="h-5 w-5" />,
  calendar: <Calendar className="h-5 w-5" />, inbox: <Inbox className="h-5 w-5" />,
  history: <History className="h-5 w-5" />, help: <HelpCircle className="h-5 w-5" />,
  modules: <BookOpen className="h-5 w-5" />, syllabus: <BookOpen className="h-5 w-5" />,
  announcements: <BookOpen className="h-5 w-5" />, activities: <BookOpen className="h-5 w-5" />,
  quizzes: <BookOpen className="h-5 w-5" />, exams: <BookOpen className="h-5 w-5" />, files: <BookOpen className="h-5 w-5" />,
  grades: <BookOpen className="h-5 w-5" />, people: <Users className="h-5 w-5" />,
  'pending-requests': <Users className="h-5 w-5" />,
  'gabay-rag': <Sparkles className="h-5 w-5" />,
  accounts: <Users className="h-5 w-5" />, page1: <Building className="h-5 w-5" />,
  page2: <BarChart3 className="h-5 w-5" />, page3: <FileCheck2 className="h-5 w-5" />,
};

export const AppRail: React.FC<{ currentTab: string; onNavigateTab: (t: string) => void }> = ({ currentTab, onNavigateTab }) => {
  const { activeRole, activeUser, logout, showConfirm, db } = useLMS();
  const chatCtx = useContext(GabayChatContext);
  const hasOngoingProcess = (chatCtx?.executingSessionIds.length ?? 0) > 0;
  const unread = db.messages.filter(m => m.recipientId === activeUser.id && !m.read).length;
  const lmsActive = ['dashboard','courses','calendar','inbox','history','help'].includes(currentTab);
  const go = (id: string) => { if (id === 'lms') onNavigateTab(activeRole === 'staff' ? 'inbox' : 'dashboard'); else onNavigateTab(id); };

  return (
    <aside className="flex w-[68px] flex-shrink-0 flex-col items-center border-r border-border/70 bg-background py-3">
      <nav className="flex flex-1 flex-col items-center gap-1">
        {MAIN_NAV.filter(i => isVisible(i, activeRole)).map(item => {
          const active = item.id === 'lms' ? lmsActive : currentTab === item.id;
          const isGabayOngoing = item.id === 'gabay-rag' && hasOngoingProcess;

          return (
            <button
              key={item.id}
              type="button"
              title={isGabayOngoing ? 'GABAY is processing an inquiry…' : item.label}
              onClick={() => go(item.id)}
              className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                active
                  ? 'bg-muted text-foreground ring-1 ring-primary/15'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {item.id === 'lms' ? (
                <GraduationCap className="h-5 w-5" />
              ) : item.id === 'gabay-rag' ? (
                <Sparkles
                  className={`h-5 w-5 transition-transform ${
                    isGabayOngoing ? 'animate-spin text-primary' : ''
                  }`}
                />
              ) : (
                ICONS[item.icon]
              )}
              {item.id === 'lms' && unread > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </button>
          );
        })}
      </nav>
      <button
        type="button"
        title="Sign Out"
        onClick={() => showConfirm('Are you sure you want to sign out of GABAY LMS?', () => logout(), 'Sign Out')}
        className="mt-2 flex h-11 w-11 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10 cursor-pointer"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </aside>
  );
};
