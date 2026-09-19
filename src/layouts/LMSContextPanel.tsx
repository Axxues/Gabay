import React from 'react';
import { LayoutDashboard, BookOpen, Calendar, Inbox, History, HelpCircle, Layers, FileText, Megaphone, FileCheck2, HelpCircle as QuizIcon, Folder, Award, Users, Copy, Check } from 'lucide-react';
import { useLMS } from '@/contexts/LMSContext';
import { LMS_CHILDREN, COURSE_CHILDREN, isVisible, isLmsSectionTab } from '@/constants/navigation';
import {
  countFacultyGradingBadge,
  countNewFiles,
  countNewGrades,
  countStudentAssessmentBadge,
  countUpcomingCalendar,
  countUnreadAnnouncements,
} from '@/utils/notifiers';
import { getDisplaySectionName } from '@/utils/sections';
const LMS_ICONS: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="h-4 w-4" />, courses: <BookOpen className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />, inbox: <Inbox className="h-4 w-4" />,
  history: <History className="h-4 w-4" />, help: <HelpCircle className="h-4 w-4" />,
};
const COURSE_ICONS: Record<string, React.ReactNode> = {
  modules: <Layers className="h-4 w-4" />, syllabus: <FileText className="h-4 w-4" />,
  announcements: <Megaphone className="h-4 w-4" />, activities: <FileCheck2 className="h-4 w-4" />,
  quizzes: <QuizIcon className="h-4 w-4" />, exams: <QuizIcon className="h-4 w-4" />, files: <Folder className="h-4 w-4" />,
  grades: <Award className="h-4 w-4" />, people: <Users className="h-4 w-4" />,
  'pending-requests': <Users className="h-4 w-4" />,
};
export const LMSContextPanel: React.FC<{ currentTab: string; courseSubTab: string; onNavigateTab: (t: string) => void; onSelectCourseTab: (t: string) => void; onNavigateCourse: (id: string, sub?: string) => void }> = (p) => {
  const { db, activeCourseId, activeRole, activeUser, getUnreadNotificationCount } = useLMS();
  const [copied, setCopied] = React.useState(false);
  const unread = db.messages.filter(m => m.recipientId === activeUser.id && !m.read).length;
  const studentSection = activeRole === 'student' && activeCourseId
    ? (db.courseSections || []).find(s => s.id === activeUser.courseSections?.[activeCourseId])
    : null;
  // LMS navigations (Dashboard, Courses, Calendar, Inbox, History, Help) belong
  // to the Learning Management section only — hide the whole context panel on
  // top-level pages outside it (Page 1/2/3, Manage College Accounts).
  if (!isLmsSectionTab(p.currentTab)) return null;
  // Students with no enrollments must not see Course Navigation.
  // Mirrors CoursesPage: enrollment truth is approved request rows, falling
  // back to enrolledCourseIds when stale.
  const approvedCourseIds = new Set(
    (db.enrollmentRequests || [])
      .filter(r => r.studentId === activeUser.id && r.status === 'approved')
      .map(r => r.courseId)
  );
  const visibleCourses = activeRole === 'student'
    ? db.courses.filter(c => (activeUser.enrolledCourseIds || []).includes(c.id) || approvedCourseIds.has(c.id))
    : db.courses;
  const studentHasNoCourses = activeRole === 'student' && visibleCourses.length === 0;
  const lmsNav = (
    <>
      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Learning Management</div>
      <nav className="space-y-1">
        {LMS_CHILDREN.filter(i => isVisible(i, activeRole)).map(item => (
          <button key={item.id} type="button" onClick={() => p.onNavigateTab(item.id)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold cursor-pointer transition-all duration-150 ${p.currentTab === item.id ? 'bg-primary text-primary-foreground shadow-primary-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground font-medium'}`}>
            <span className="flex items-center gap-2.5">{LMS_ICONS[item.id]}<span>{item.label}</span></span>
            {item.id === 'inbox' && unread > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{unread}</span>}
          </button>
        ))}
      </nav>
    </>
  );
  if (p.currentTab === 'courses') {
    // Unenrolled students get LMS nav only — no course header, join code,
    // or course sub-tabs to open.
    if (studentHasNoCourses) {
      return (
        <aside className="flex w-[240px] flex-shrink-0 flex-col border-r border-border/60 bg-card/50 p-3">
          <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto">
            {lmsNav}
          </div>
          <div className="px-2 pt-3 text-[10px] text-muted-foreground">Trail: LMS &gt; courses</div>
        </aside>
      );
    }
    const course = visibleCourses.find(c => c.id === activeCourseId) ?? visibleCourses[0];
    const sectionsForCourse = course ? (db.courseSections || []).filter(s => s.courseId === course.id) : [];
    // Prefer the student's assigned section; otherwise fall back to the
    // course's display section (first section row, then course.section label).
    const displaySection = (studentSection?.name || (course ? getDisplaySectionName(course, sectionsForCourse) : '')).trim();
    const courseBadgeFor = (tabId: string): number => {
      if (!course) return 0;
      const cid = course.id;
      const visits = activeUser.lastVisitedAt || {};
      if (tabId === 'inbox') return 0;
      if (tabId === 'modules') return getUnreadNotificationCount(activeUser.id, 'module_comment_reply');
      if (tabId === 'announcements') {
        const sectionId = activeUser.courseSections?.[cid] ?? null;
        return countUnreadAnnouncements(db.announcements || [], { id: activeUser.id, role: activeRole, sectionId }, cid);
      }
      if (tabId === 'activities') {
        if (activeRole === 'faculty') {
          // Classic rows live in db.activities (format === 'classic');
          // question sets link submissions via the synthetic
          // asg-activity-<id> key (values preserved).
          const courseActivities = (db.activities || []).filter(a => a.courseId === cid);
          const ids = [
            ...courseActivities.filter(a => a.format === 'classic').map(a => a.id),
            ...courseActivities.filter(a => a.format !== 'classic').map(a => `asg-activity-${a.id}`),
          ];
          return countFacultyGradingBadge(db.submissions.filter(s => s.courseId === cid), ids);
        }
        const publishedActivities = (db.activities || []).filter(a => a.courseId === cid && a.published);
        const pub = [
          ...publishedActivities.filter(a => a.format === 'classic').map(a => a.id),
          ...publishedActivities.filter(a => a.format !== 'classic').map(a => `asg-activity-${a.id}`),
        ];
        const mine = db.submissions.filter(s => s.courseId === cid && s.studentId === activeUser.id).map(s => s.activityKey ?? '');
        return countStudentAssessmentBadge(pub, mine);
      }
      if (tabId === 'quizzes') {
        if (activeRole === 'faculty') {
          const ids = (db.quizzes || []).filter(q => q.courseId === cid).map(q => `asg-quiz-${q.id}`);
          return countFacultyGradingBadge(db.submissions.filter(s => s.courseId === cid), ids);
        }
        const pub = (db.quizzes || []).filter(q => q.courseId === cid && q.published).map(q => q.id);
        const taken = db.submissions.filter(s => s.courseId === cid && s.studentId === activeUser.id && (s.activityKey ?? '').startsWith('asg-quiz-')).map(s => (s.activityKey ?? '').replace('asg-quiz-', ''));
        const submitted = new Set(taken);
        return pub.filter(id => !submitted.has(id)).length;
      }
      if (tabId === 'files') return countNewFiles(db.courseFiles || [], cid, visits);
      if (tabId === 'grades') {
        if (activeRole !== 'student') return 0;
        return countNewGrades(db.courseGrades || [], cid, activeUser.id, visits);
      }
      if (tabId === 'people' || tabId === 'pending-requests') {
        if (activeRole !== 'faculty' && activeRole !== 'admin') return 0;
        // Sync read of the request cache (bootstrap fills it per course);
        // the async getter cannot be awaited inside this badge counter.
        return (db.enrollmentRequests || []).filter(r => r.courseId === cid && r.status === 'pending').length;
      }
      if (tabId === 'calendar') return countUpcomingCalendar(db.calendarEvents || [], cid, visits);
      return 0;
    };
    return (
      <aside className="flex w-[240px] flex-shrink-0 flex-col border-r border-border/60 bg-card/50 p-3">
        <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto">
          {lmsNav}
          <div className="mx-1 my-2 border-t border-border" />
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Course Navigation</div>
          <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-border bg-card p-3">
            <span className="h-8 w-1.5 rounded-full" style={{ backgroundColor: course?.color ?? '#64748b' }} />
            <div className="min-w-0"><div className="truncate text-xs font-extrabold">{course?.code}</div><div className="truncate text-[11px] text-muted-foreground">{course?.title}</div>
              {displaySection && (
                <div className="truncate text-[10px] text-primary font-bold mt-0.5">
                  Section {displaySection}
                </div>
              )}</div>
          </div>
          {course?.joinCode && <button type="button" onClick={() => { try { navigator.clipboard.writeText(course.joinCode ?? ''); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }} className="mb-2 flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 font-mono text-[11px] font-bold cursor-pointer">{course.joinCode}{copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}</button>}
          <nav className="space-y-1">
            {COURSE_CHILDREN.filter(i => isVisible(i, activeRole)).map(item => (
              <button key={item.id} type="button" onClick={() => p.onSelectCourseTab(item.id)}
                className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold cursor-pointer transition-all duration-150 ${p.courseSubTab === item.id ? 'bg-primary text-primary-foreground shadow-primary-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground font-medium'}`}><span className="flex items-center gap-2.5">{COURSE_ICONS[item.id]}<span>{item.label}</span></span>{(() => {
                  const n = courseBadgeFor(item.id);
                  return n > 0 ? (
                    <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                      {n}
                    </span>
                  ) : null;
                })()}</button>
            ))}
          </nav>
        </div>
        <div className="px-2 pt-3 text-[10px] text-muted-foreground">Trail: LMS &gt; courses &gt; {p.courseSubTab}</div>
      </aside>
    );
  }
  return (
    <aside className="flex w-[240px] flex-shrink-0 flex-col border-r border-border/60 bg-card/50 p-3">
      {lmsNav}
      <div className="mt-auto px-2 pt-3 text-[10px] text-muted-foreground">Trail: LMS &gt; {p.currentTab}</div>
    </aside>
  );
};
