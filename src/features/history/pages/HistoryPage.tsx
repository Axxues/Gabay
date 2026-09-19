import React, { useState } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import {
  Clock,
  ExternalLink,
  Search,
  Trash2,
  ArrowLeft,
  BookOpen,
  Calendar,
  Inbox,
  LayoutDashboard,
  Shield
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';

interface HistoryPageProps {
  onNavigateCourse?: (courseId: string, subTab?: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onNavigateCourse,
  onNavigateTab
}) => {
  const { db, isLoading, isSyncing, clearHistory, setActiveCourseId, showConfirm } = useLMS();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'courses' | 'lms'>('all');

  const historyLogs = db.historyLogs || [];

  // Filter logs by query and type
  const filteredLogs = historyLogs.filter(log => {
    const matchesSearch =
      log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.timestamp.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'courses') return log.path.includes('/courses/');
    if (filterType === 'lms') return !log.path.includes('/courses/');
    return true;
  });

  const handleClearHistory = () => {
    showConfirm(
      "Are you sure you want to clear your current navigation history?",
      () => {
        clearHistory();
      },
      "Clear History"
    );
  };

  const handleOpenLog = (path: string) => {
    if (path.includes('/courses/')) {
      const match = path.match(/crs-[a-z0-9]+/);
      if (match) {
        const courseId = match[0];
        setActiveCourseId(courseId);

        // Extract subTab if present
        const parts = path.split('/');
        const subTab = parts[parts.length - 1];
        const validSubTabs = ['modules', 'syllabus', 'activities', 'quizzes', 'grades', 'people'];
        const targetSubTab = validSubTabs.includes(subTab) ? subTab : 'modules';

        if (onNavigateCourse) {
          onNavigateCourse(courseId, targetSubTab);
        } else if (onNavigateTab) {
          onNavigateTab('courses');
        }
        return;
      }
    }

    if (path.includes('/dashboard')) onNavigateTab?.('dashboard');
    else if (path.includes('/calendar')) onNavigateTab?.('calendar');
    else if (path.includes('/inbox')) onNavigateTab?.('inbox');
    else if (path.includes('/profile')) onNavigateTab?.('profile');
    else onNavigateTab?.('dashboard');
  };

  const getLogIcon = (path: string) => {
    if (path.includes('/courses/')) return <BookOpen className="w-4 h-4 text-muted-foreground" />;
    if (path.includes('/calendar')) return <Calendar className="w-4 h-4 text-muted-foreground" />;
    if (path.includes('/inbox')) return <Inbox className="w-4 h-4 text-muted-foreground" />;
    return <LayoutDashboard className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="flex min-h-full w-full flex-1 flex-col space-y-6">
      {/* Top Header & Breadcrumb Bar */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => onNavigateTab && onNavigateTab('dashboard')}
          className="p-2 bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all shadow-subtle cursor-pointer active:scale-[0.98] shrink-0 mt-0.5"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <PageHeader
            title="History"
            description="Pages and courses you recently visited."
            actions={
              historyLogs.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold bg-card border border-border hover:border-red-500/30 hover:bg-red-500/10 text-muted-foreground hover:text-red-700 dark:hover:text-red-400 rounded-xl transition-all shadow-subtle cursor-pointer active:scale-[0.98]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              )
            }
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-border rounded-2xl space-y-1">
          <span className="text-[12px] font-semibold font-sans text-muted-foreground">Total events</span>
          <div className="text-2xl font-extrabold font-sans text-foreground tabular-nums">
            {historyLogs.length}
          </div>
          <p className="text-[12px] text-muted-foreground">Recorded this session</p>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl space-y-1">
          <span className="text-[12px] font-semibold font-sans text-muted-foreground">Course shells</span>
          <div className="text-2xl font-extrabold font-sans text-foreground tabular-nums">
            {historyLogs.filter(l => l.path.includes('/courses/')).length}
          </div>
          <p className="text-[12px] text-muted-foreground">Subject page transitions</p>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl space-y-1">
          <span className="text-[12px] font-semibold font-sans text-muted-foreground">Session state</span>
          <div className="text-2xl font-extrabold font-sans text-foreground">
            Active
          </div>
          <p className="text-[12px] text-muted-foreground">DMMMSU-SLUC SSO</p>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl space-y-1">
          <span className="text-[12px] font-semibold font-sans text-muted-foreground">Security guard</span>
          <div className="text-xs font-sans font-bold text-foreground mt-1.5 flex items-center space-x-1">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>RA 10173 Audit</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Encrypted memory store</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border border-border rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search navigation logs by title, path, or timestamp..."
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs font-sans text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30 shadow-inner outline-none"
          />
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-primary text-primary-foreground shadow-subtle'
                : 'bg-muted/50 hover:bg-muted text-muted-foreground'
            }`}
          >
            All Logs ({historyLogs.length})
          </button>
          <button
            onClick={() => setFilterType('courses')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'courses'
                ? 'bg-primary text-primary-foreground shadow-subtle'
                : 'bg-muted/50 hover:bg-muted text-muted-foreground'
            }`}
          >
            Course Shells
          </button>
          <button
            onClick={() => setFilterType('lms')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'lms'
                ? 'bg-primary text-primary-foreground shadow-subtle'
                : 'bg-muted/50 hover:bg-muted text-muted-foreground'
            }`}
          >
            LMS Modules
          </button>
        </div>
      </div>

      {/* History Log Timeline Cards */}
      <div className="space-y-3">
        {((isLoading || isSyncing) && historyLogs.length === 0) ? (
          <div data-testid="history-loading" className="space-y-3" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`history-skeleton-${i}`} className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3.5 animate-pulse">
                <div className="p-2.5 bg-muted/60 rounded-xl border border-border shrink-0 w-11 h-11" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-1/2 rounded bg-muted" />
                  <div className="h-3 w-2/3 rounded bg-muted/70" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            title="No navigation records found"
            body={
              searchQuery
                ? 'No history records match your search criteria. Try modifying your keywords.'
                : 'Navigate between LMS modules or course shells to build your session trail.'
            }
          />
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={log.id || index}
              onClick={() => handleOpenLog(log.path)}
              className="p-4 bg-card border border-border hover:ring-1 hover:ring-primary/15 rounded-2xl transition-all flex items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="p-2.5 bg-muted/60 rounded-xl border border-border shrink-0 transition-colors">
                  {getLogIcon(log.path)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-[14px] text-foreground truncate">
                      {log.title}
                    </h4>
                    {log.path.includes('/courses/') && (
                      <span className="px-2 py-0.5 text-[11px] font-sans font-medium rounded-full bg-muted text-muted-foreground border border-border shrink-0">
                        Course
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] font-sans text-muted-foreground truncate mt-0.5">
                    {log.path}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 shrink-0">
                <div className="flex items-center space-x-1 text-[11px] font-sans text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span>{log.timestamp}</span>
                </div>
                <button
                  type="button"
                  className="p-2 rounded-xl bg-muted/60 group-hover:bg-primary group-hover:text-primary-foreground text-muted-foreground transition-all shadow-soft shrink-0 cursor-pointer"
                  title="Navigate back to this view"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
