import React, { useState } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import type { EnrollmentRequest } from '@/services/lms/types/lms.types';
import { getDisplaySectionName } from '@/utils/sections';
import { JoinCourseModal } from '@/features/courses/components/enrollment/JoinCourseModal';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  BookOpen,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Award,
  ArrowRight,
  Plus,
  Megaphone,
  Folder,
  KeyRound,
  Copy,
  Check,
  ShieldCheck,
  Trash2,
  Users,
  Loader2
} from 'lucide-react';
import { useProcessing } from '@/hooks/useProcessing';

interface DashboardPageProps {
  onNavigateCourse: (courseId: string, subTab?: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateCourse,
  onNavigateTab
}) => {
  const { activeRole, activeUser, db, isLoading, openSpeedGrader, getPendingRequestsForStudent, studentApproveInvitation, studentDeclineInvitation, deleteCourse, showConfirm, showAlert, getApprovedRequestsForCourse } = useLMS() as ReturnType<typeof useLMS> & {
    // Sibling-WIP course-deletion helpers: typed here until the course
    // surface provides them on the context.
    deleteCourse: (courseId: string) => Promise<void>;
    getApprovedRequestsForCourse: (courseId: string) => Promise<{ courseId: string }[]>;
  };
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [copiedCodeCourseId, setCopiedCodeCourseId] = useState<string | null>(null);
  const { isProcessing, run } = useProcessing();
  const pendingInvitations = getPendingRequestsForStudent();
  const facultyInvites = pendingInvitations.filter(req => req.type === 'faculty_enroll');
  const selfJoinRequests = pendingInvitations.filter(req => req.type === 'self_join');
  const switchRequests = pendingInvitations.filter(req => req.type === 'section_switch');

  // Filter courses based on user role (approved requests are the
  // enrollment truth — fall back to them when enrolledCourseIds is stale).
  const approvedCourseIds = new Set(
    (db.enrollmentRequests || [])
      .filter(r => r.studentId === activeUser.id && r.status === 'approved')
      .map(r => r.courseId)
  );
  const userCourses = db.courses.filter(c => {
    if (activeRole === 'student') {
      return (activeUser.enrolledCourseIds || []).includes(c.id) || approvedCourseIds.has(c.id);
    }
    if (activeRole === 'faculty') return c.instructorId === activeUser.id;
    return true;
  });

  const unsubmittedList = db.submissions.filter(s => s.status === 'submitted');

  // Pending rows can reference courses outside the cached (enrolled-only)
  // list — prefer the live cache, fall back to the server snapshot, and
  // never render a bare "—".
  const requestCourseLabel = (req: EnrollmentRequest): string => {
    const course = db.courses.find(c => c.id === req.courseId);
    const code = course?.code ?? req.courseCode ?? undefined;
    const title = course?.title ?? req.courseTitle ?? undefined;
    if (code || title) return `${code ?? ''}${code && title ? ' — ' : ''}${title ?? ''}`;
    return 'Pending course request';
  };  const publishedActivities = (db.activities || []).filter(a => a.published);
  const todoItems = [
    ...publishedActivities.filter(a => a.format === 'classic').map(act => ({
      id: act.id,
      courseId: act.courseId,
      title: act.title,
      category: act.category || 'Activity',
      pointsLabel: `${act.pointsPossible} pts`,
      dueDate: act.dueDate,
      submitted: db.submissions.some(s => s.activityKey === act.id && s.studentId === activeUser.id)
    })),
    ...publishedActivities.filter(a => a.format !== 'classic').map(a => ({
      id: a.id,
      courseId: a.courseId,
      title: a.title,
      category: 'Question Set',
      pointsLabel: `${a.pointsPossible} pts`,
      dueDate: a.dueDate,
      submitted: db.submissions.some(s => s.activityKey === `asg-activity-${a.id}` && s.studentId === activeUser.id)
    }))
  ];
  const hasRightSidebar = activeRole === 'student' || activeRole === 'faculty' || activeRole === 'admin';

  // Dynamic Instructor Name Resolution
  const getCourseInstructorName = (course: (typeof db.courses)[0]) => {
    if (activeRole === 'faculty' && (course.instructorId === activeUser.id || !course.instructorId)) {
      return activeUser.name;
    }
    const instructor = db.users.find(u => u.id === course.instructorId);
    if (instructor) return instructor.name;
    return course.instructorName || activeUser.name;
  };

  // Dynamic Enrolled Students Count Resolution
  const getCourseStudentCount = (course: (typeof db.courses)[0]) => {
    const matchingStudents = db.users.filter(u =>
      u.role === 'student' &&
      (!u.enrolledCourseIds || u.enrolledCourseIds.includes(course.id))
    );
    return Math.max(matchingStudents.length, course.enrolledCount || 0);
  };

  // Faculty delete flow: strong confirmation when students are enrolled or
  // content exists, simple confirm for empty shells.
  // Student count comes from approved enrollment requests (server truth),
  // not the drift-prone local enrolledCount counter.
  const handleDeleteCourse = async (courseId: string) => {
    const course = db.courses.find(c => c.id === courseId);
    if (!course) return;
    let studentCount: number | null = null;
    try {
      studentCount = (await getApprovedRequestsForCourse(courseId)).length;
    } catch {
      studentCount = null;
    }
    const contentCount =
      db.modules.filter(m => m.courseId === courseId).length +
      (db.activities || []).filter(a => a.courseId === courseId).length +
      (db.quizzes || []).filter(q => q.courseId === courseId).length;
    const doDelete = () => {
      void run(`delete:${courseId}`, async () => {
        try {
          await deleteCourse(courseId);
          showAlert({
            title: 'Course Deleted',
            message: `"${course.code} — ${course.title}" has been permanently deleted.`,
            type: 'success'
          });
        } catch {
          // deleteCourse already surfaces the error via showAlert.
        }
      });
    };
    // Unknown count (fetch failed) takes the strong confirmation path —
    // the safe direction.
    if ((studentCount ?? 1) > 0 || contentCount > 0) {
      const studentPhrase = studentCount === null
        ? 'enrolled students'
        : `${studentCount} enrolled student(s)`;
      showAlert({
        title: 'Delete Course Permanently?',
        message: `"${course.code} — ${course.title}" has ${studentPhrase} and ${contentCount} content item(s). Deleting will permanently remove the course, all its modules, activities, quizzes, files, grades, and student enrollments. This cannot be undone.`,
        type: 'confirm',
        confirmText: 'Delete Permanently',
        cancelText: 'Keep Course',
        onConfirm: doDelete
      });
    } else {
      showConfirm(
        `Are you sure you want to permanently delete "${course.code} — ${course.title}"? This cannot be undone.`,
        doDelete,
        'Delete Course'
      );
    }
  };

  return (
    <div className="flex min-h-full w-full flex-1 flex-col space-y-8">
      {/* Main Grid Section */}
      <div className={hasRightSidebar ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "space-y-6"}>
        {/* Left Pane: Enrolled Course Cards */}
        <div className={hasRightSidebar ? "lg:col-span-2 space-y-4" : "space-y-4"}>
          <PageHeader
            title="My courses"
            description="Your enrolled course shells"
            actions={
              <>
                {activeRole === 'student' && (
                  <button
                    type="button"
                    onClick={() => setIsJoinModalOpen(true)}
                    className="px-3.5 py-2 text-xs font-bold bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Join course</span>
                  </button>
                )}
                {activeRole === 'faculty' && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('create-course')}
                    className="px-3.5 py-2 text-xs font-bold bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create course</span>
                  </button>
                )}
                <span className="text-xs font-sans text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border tabular-nums">
                  {userCourses.length} courses
                </span>
              </>
            }
          />

          {/* Empty State or Course Cards Grid */}
          {isLoading && userCourses.length === 0 ? (
            <div data-testid="dashboard-courses-loading" className={`grid gap-5 ${hasRightSidebar ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`} aria-hidden="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`dashboard-courses-skeleton-${i}`} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-28 bg-muted" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted/70" />
                  </div>
                </div>
              ))}
            </div>
          ) : userCourses.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-6 w-6" />}
              title="No enrolled courses"
              body={activeRole === 'student'
                ? 'You are not enrolled in any courses yet. Ask your faculty instructor for the course join code and click below to enter your code.'
                : 'No course shells assigned to your account.'}
              actionLabel={activeRole === 'student' ? 'Enter course join code' : undefined}
              onAction={activeRole === 'student' ? () => setIsJoinModalOpen(true) : undefined}
            />
          ) : (
            <div className={`grid gap-5 ${hasRightSidebar ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
            {userCourses.map(course => {
              const deleting = isProcessing(`delete:${course.id}`);
              return (
              <div
                key={course.id}
                onClick={() => { if (!deleting) onNavigateCourse(course.id, 'modules'); }}
                aria-busy={deleting || undefined}
                className={`group relative bg-card text-card-foreground border border-border rounded-2xl overflow-hidden hover:ring-1 hover:ring-primary/15 flex flex-col justify-between ${deleting ? 'opacity-60 pointer-events-none cursor-wait' : 'cursor-pointer'}`}
              >
                {deleting && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-card/70 backdrop-blur-[1px]">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground">Deleting…</span>
                  </div>
                )}
                <div>
                  {/* Card Color Header */}
                  <div
                    className="h-20 p-4 flex flex-col justify-between relative overflow-hidden bg-muted/50"
                    style={
                      course.color
                        ? {
                            backgroundColor: `${course.color}14`,
                            boxShadow: `0 12px 32px -12px color-mix(in srgb, ${course.color} 45%, transparent), inset 0 -28px 36px -24px color-mix(in srgb, ${course.color} 55%, transparent)`,
                          }
                        : undefined
                    }
                  >
                    {course.image && (
                      <img
                        src={course.image}
                        alt={course.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                      />
                    )}
                    {course.image && course.color && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `linear-gradient(180deg, transparent 25%, color-mix(in srgb, ${course.color} 34%, transparent) 100%)`,
                        }}
                      />
                    )}

                    <div className="flex items-center justify-between relative z-10">
                      <span className="px-2.5 py-0.5 text-[10px] font-sans font-semibold bg-muted text-muted-foreground rounded-full border border-border">
                        {course.code} • {getDisplaySectionName(course, (db.courseSections || []).filter(s => s.courseId === course.id))}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground text-[14px] leading-tight truncate relative z-10">
                      {course.title}
                    </h3>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3">
                    <div className="text-xs space-y-1.5">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Instructor</span>
                        <span className="font-semibold text-foreground">{getCourseInstructorName(course)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground font-sans text-[12px]">
                        <span>Enrollment</span>
                        <span className="text-foreground font-semibold tabular-nums">
                          {getCourseStudentCount(course)} {getCourseStudentCount(course) === 1 ? 'student' : 'students'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-muted-foreground font-sans text-[12px] pt-1.5 border-t border-border/50">
                        <span className="flex items-center space-x-1">
                          <KeyRound className="w-3 h-3 text-muted-foreground" />
                          <span>Join code</span>
                        </span>
                        <div className="flex items-center space-x-1">
                          <span className="font-mono font-bold text-foreground bg-muted px-1.5 py-0.5 rounded border border-border text-[10px]">
                            {course.joinCode || 'N/A'}
                          </span>
                          {course.joinCode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(course.joinCode || '');
                                setCopiedCodeCourseId(course.id);
                                setTimeout(() => setCopiedCodeCourseId(null), 2000);
                              }}
                              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Copy Join Code"
                            >
                              {copiedCodeCourseId === course.id ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-2.5 bg-muted/40 border-t border-border flex items-center justify-between text-xs group-hover:bg-muted/60 transition-colors">
                  <span className="font-semibold text-foreground flex items-center space-x-1.5">
                    <span>View modules</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                  </span>

                  {/* Quick Action Icons */}
                  <div
                    className="flex items-center space-x-1"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      title="Announcements"
                      onClick={() => onNavigateCourse(course.id, 'announcements')}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-card rounded-lg transition-colors cursor-pointer"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Course Files"
                      onClick={() => onNavigateCourse(course.id, 'files')}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-card rounded-lg transition-colors cursor-pointer"
                    >
                      <Folder className="w-3.5 h-3.5" />
                    </button>
                    {activeRole === 'faculty' && (
                      <button
                        type="button"
                        title={deleting ? 'Deleting course…' : 'Delete Course'}
                        onClick={() => handleDeleteCourse(course.id)}
                        disabled={deleting}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                      >
                        {deleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Right Sidebar Widgets */}
        {hasRightSidebar && (
          <div className="space-y-6">
            {/* STUDENT WIDGETS */}
          {activeRole === 'student' && (
            <>
              {/* Pending Invitations Card */}
              {activeRole === 'student' && pendingInvitations.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" /> {facultyInvites.length > 0 ? 'Pending invitations' : 'Pending requests'}
                  </h3>
                  {facultyInvites.map(req => {
                    const course = db.courses.find(c => c.id === req.courseId);
                    return (
                      <div key={req.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                        <div>
                          <div className="text-xs font-bold">{requestCourseLabel(req)}</div>
                          <div className="text-[11px] text-muted-foreground">Invited by {course?.instructorName}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              void run(`accept:${req.id}`, async () => {
                                const ok = await studentApproveInvitation(req.id);
                                if (ok) onNavigateCourse(req.courseId, 'section-selection');
                              });
                            }}
                            disabled={isProcessing(`accept:${req.id}`) || isProcessing(`decline:${req.id}`)}
                            className="px-3 py-1.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center gap-1"
                          >
                            {isProcessing(`accept:${req.id}`) && <Loader2 className="w-3 h-3 animate-spin" />}
                            {isProcessing(`accept:${req.id}`) ? 'Accepting...' : 'Accept'}
                          </button>
                          <button
                            onClick={() => {
                              void run(`decline:${req.id}`, () => studentDeclineInvitation(req.id));
                            }}
                            disabled={isProcessing(`accept:${req.id}`) || isProcessing(`decline:${req.id}`)}
                            className="px-3 py-1.5 text-[11px] font-bold bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center gap-1"
                          >
                            {isProcessing(`decline:${req.id}`) && <Loader2 className="w-3 h-3 animate-spin" />}
                            {isProcessing(`decline:${req.id}`) ? 'Declining...' : 'Decline'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {selfJoinRequests.map(req => {
                    return (
                      <div key={req.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                        <div>
                          <div className="text-xs font-bold">{requestCourseLabel(req)}</div>
                          <div className="text-[11px] text-muted-foreground">Request sent — waiting for instructor approval</div>
                        </div>
                        <button
                          onClick={() => {
                            void run(`withdraw:${req.id}`, () => studentDeclineInvitation(req.id));
                          }}
                          disabled={isProcessing(`withdraw:${req.id}`)}
                          className="px-3 py-1.5 text-[11px] font-bold bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center gap-1"
                        >
                          {isProcessing(`withdraw:${req.id}`) && <Loader2 className="w-3 h-3 animate-spin" />}
                          {isProcessing(`withdraw:${req.id}`) ? 'Withdrawing...' : 'Withdraw request'}
                        </button>
                      </div>
                    );
                  })}
                  {switchRequests.map(req => {
                    const targetName = (db.courseSections || []).find(s => s.id === req.targetSectionId)?.name;
                    return (
                      <div key={req.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                        <div>
                          <div className="text-xs font-bold">{requestCourseLabel(req)}</div>
                          <div className="text-[11px] text-muted-foreground">Switch pending{targetName ? ` → ${targetName}` : ''}</div>
                        </div>
                        <button
                          onClick={() => {
                            void run(`withdraw:${req.id}`, () => studentDeclineInvitation(req.id));
                          }}
                          disabled={isProcessing(`withdraw:${req.id}`)}
                          className="px-3 py-1.5 text-[11px] font-bold bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center gap-1"
                        >
                          {isProcessing(`withdraw:${req.id}`) && <Loader2 className="w-3 h-3 animate-spin" />}
                          {isProcessing(`withdraw:${req.id}`) ? 'Withdrawing...' : 'Withdraw'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* To-Do List Card */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <h3 className="font-bold text-sm text-foreground flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>To-do list</span>
                  </h3>
                  <span className="text-[11px] font-sans font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border tabular-nums">
                    {todoItems.length} pending
                  </span>
                </div>

                <div className="space-y-2.5">
                  {todoItems.map(item => {
                    return (
                      <div
                        key={item.id}
                        onClick={() => onNavigateCourse(item.courseId, 'activities')}
                        className="p-3.5 bg-muted/50 rounded-xl border border-border hover:ring-1 hover:ring-primary/15 cursor-pointer transition-all space-y-1.5"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="text-[14px] font-semibold text-foreground leading-tight">
                            {item.title}
                          </h4>
                          {item.submitted ? (
                            <span className="px-2 py-0.5 text-[11px] font-sans font-semibold bg-muted text-muted-foreground rounded-full border border-border">
                              Submitted
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[11px] font-sans font-semibold bg-muted text-muted-foreground rounded-full border border-border">
                              Due soon
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[12px] font-sans text-muted-foreground">
                          <span>{item.category} • {item.pointsLabel}</span>
                          <span>Due {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Feedback Alerts Card */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <h3 className="font-bold text-sm text-foreground flex items-center space-x-2">
                    <Award className="w-4 h-4 text-muted-foreground" />
                    <span>Recent feedback</span>
                  </h3>
                </div>

                <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">Lab 1: Full-Stack SPA</span>
                    <span className="font-sans font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">96/100</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic leading-relaxed">
                    "Great work on the lab activity! Code is clean and well structured."
                  </p>
                  <div className="text-[10px] font-sans text-muted-foreground pt-1 border-t border-emerald-500/20">
                    Graded by {db.users.find(u => u.role === 'faculty')?.name || activeUser.name}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* FACULTY WIDGETS */}
          {activeRole === 'faculty' && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <h3 className="font-bold text-sm text-foreground flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span>To grade</span>
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-sans font-semibold bg-muted text-muted-foreground rounded-full border border-border tabular-nums">
                  {unsubmittedList.length} items
                </span>
              </div>

              <div className="space-y-3">
                {unsubmittedList.map(sub => {
                  const act = (db.activities || []).find(a => a.id === sub.activityKey || `asg-activity-${a.id}` === sub.activityKey);
                  return (
                    <div
                      key={sub.id}
                      className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-foreground">
                            {sub.studentName}
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            {act?.title}
                          </p>
                        </div>
                        <span className="text-[10px] font-sans text-muted-foreground">
                          {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openSpeedGrader(sub.id)}
                        className="w-full py-2 px-3 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all flex items-center justify-center space-x-1.5 active:scale-[0.98] cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Launch SpeedGrader</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ADMIN WIDGETS */}
          {activeRole === 'admin' && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <h3 className="font-bold text-sm text-foreground flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                  <span>College system overview</span>
                </h3>
                <span className="px-2.5 py-0.5 text-[11px] font-sans font-semibold bg-muted text-muted-foreground rounded-full border border-border">
                  Read-only audit
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-1">
                  <span className="text-[12px] font-semibold font-sans text-muted-foreground">Total courses</span>
                  <div className="text-xl font-bold font-sans text-foreground tabular-nums">{db.courses.length}</div>
                </div>
                <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-1">
                  <span className="text-[12px] font-semibold font-sans text-muted-foreground">Total faculty</span>
                  <div className="text-xl font-bold font-sans text-foreground tabular-nums">
                    {db.users.filter(u => u.role === 'faculty').length}
                  </div>
                </div>
                <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-1">
                  <span className="text-[12px] font-semibold font-sans text-muted-foreground">Enrolled students</span>
                  <div className="text-xl font-bold font-sans text-foreground tabular-nums">
                    {db.users.filter(u => u.role === 'student').length}
                  </div>
                </div>
                <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-1">
                  <span className="text-[12px] font-semibold font-sans text-muted-foreground">Staff accounts</span>
                  <div className="text-xl font-bold font-sans text-foreground tabular-nums">
                    {db.users.filter(u => u.role === 'staff').length}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('accounts')}
                className="w-full py-2.5 px-3 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all flex items-center justify-center space-x-2 active:scale-[0.98] cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Manage college accounts</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>

    <JoinCourseModal
      isOpen={isJoinModalOpen}
      onClose={() => setIsJoinModalOpen(false)}
      onNavigateCourse={onNavigateCourse}
    />
  </div>
  );
};

export default DashboardPage;
