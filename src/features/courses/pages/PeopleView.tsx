import React, { useEffect, useState } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import type { EnrollmentRequest, User } from '@/services/lms/types/lms.types';
import {
  Shield,
  Search,
  UserPlus,
  UserX,
  X,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useProcessing, useBusyFlag } from '@/hooks/useProcessing';
import { AnimatedModal } from '@/components/shared/ModalPortal';
import { PageHeader } from '@/components/shared/PageHeader';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { canPickSection } from '@/utils/sections';

interface PeopleViewProps {
  courseId: string;
}

export const PeopleView: React.FC<PeopleViewProps> = ({ courseId }) => {
  const { db, activeRole, activeUser, isLoading, enrollStudentsInCourse, regenerateCourseJoinCode, getPendingRequestsForCourse, approveEnrollmentRequests, rejectEnrollmentRequests, removeStudentFromCourse, showAlert, showConfirm } = useLMS();
  const course = db.courses.find(c => c.id === courseId);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'roster' | 'pending'>('roster');
  const [pendingRequests, setPendingRequests] = useState<EnrollmentRequest[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const pendingCount = pendingRequests.length;
  const { isProcessing, run } = useProcessing();
  const { busy: enrollBusy, run: runEnroll } = useBusyFlag();

  const reloadPending = async () => {
    setPendingLoading(true);
    try {
      setPendingRequests(await getPendingRequestsForCourse(courseId));
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPendingLoading(true);
      try {
        const reqs = await getPendingRequestsForCourse(courseId);
        if (!cancelled) setPendingRequests(reqs);
      } finally {
        if (!cancelled) setPendingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  // Enroll modal state
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const approvedStudentIds = new Set(
    (db.enrollmentRequests || [])
      .filter(r => r.courseId === courseId && r.status === 'approved')
      .map(r => r.studentId)
  );
  const students = db.users.filter(u => {
    if (u.role !== 'student') return false;
    if (u.enrolledCourseIds?.includes(courseId) || approvedStudentIds.has(u.id)) {
      return true;
    } else {
      return false;
    }
  });
  const instructors = db.users.filter(u => u.role === 'faculty' || u.id === course?.instructorId);

  const allPeople = [...instructors, ...students].filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.studentId && u.studentId.toLowerCase().includes(searchQuery.toLowerCase()));

    if (roleFilter === 'all') return matchesSearch;
    return matchesSearch && u.role === roleFilter;
  });

  // All student accounts in the system
  const allStudentAccounts = db.users.filter(u => u.role === 'student');

  const selectedStudents = allStudentAccounts.filter(u => selectedStudentIds.includes(u.id));

  const filteredModalStudents = allStudentAccounts.filter(u => {
    const query = modalSearchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.studentId && u.studentId.toLowerCase().includes(query))
    );
  });

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleRemoveStudent = (student: User) => {
    if (isProcessing(`remove:${student.id}`)) return;
    showConfirm(
      `Remove ${student.name} from ${course?.code || 'this course'}? They will lose access, but their coursework stays on record.`,
      () => {
        void run(`remove:${student.id}`, async () => {
          const ok = await removeStudentFromCourse(courseId, student.id);
          if (!ok) return;
          showAlert({ title: 'Student Removed', message: `${student.name} has been removed from ${course?.code || 'the course'}.`, type: 'success' });
        });
      },
      'Remove Student'
    );
  };

  const handleEnrollSelectedStudents = () => {
    if (selectedStudentIds.length === 0) return;

    void runEnroll(async () => {
      const ok = await enrollStudentsInCourse(selectedStudentIds, courseId);
      if (!ok) return;

      showAlert({
        title: 'Invitations Sent',
        message: `Invited ${selectedStudentIds.length} student${selectedStudentIds.length > 1 ? 's' : ''} to ${course?.code || 'the course'}. They will appear on the roster once they accept.`,
        type: 'success'
      });

      await reloadPending();
      setIsEnrollModalOpen(false);
      setSelectedStudentIds([]);
      setModalSearchQuery('');
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow={course?.code}
        title="People"
        description={course?.section ? `Section ${course.section}` : 'Course roster and enrollment requests'}
        actions={
          activeRole === 'faculty' && (
            <button
              onClick={() => {
                setSelectedStudentIds([]);
                setModalSearchQuery('');
                setIsEnrollModalOpen(true);
              }}
              className="px-3.5 py-2 text-[12px] font-bold bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground rounded-xl transition-all shadow-primary-sm flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enroll person</span>
            </button>
          )
        }
      />

      {/* Course Join Code Banner */}
      {course?.joinCode && (
        <div className="px-4 py-3.5 bg-card border border-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-muted border border-border text-foreground flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12.5px] font-semibold text-muted-foreground">Join code</span>
                <span className="font-mono font-bold text-[13px] tracking-widest text-foreground bg-muted px-2.5 py-1 rounded-lg border border-border">
                  {course.joinCode}
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Share this code for students to self-enroll.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(course.joinCode || '');
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="px-3.5 py-1.5 bg-card hover:bg-muted border border-border text-foreground text-xs font-bold rounded-xl transition-all shadow-subtle flex items-center space-x-1.5 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
            {activeRole === 'faculty' && (
              <button
                type="button"
                onClick={() => {
                  void regenerateCourseJoinCode(course.id);
                }}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
                title="Regenerate Join Code"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search & Role Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Tab Toggle */}
        <div className="flex p-1 bg-muted rounded-full w-fit">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-3.5 py-1.5 text-[12px] font-semibold rounded-full cursor-pointer transition-all ${
              activeTab === 'roster' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Roster
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 text-[12px] font-semibold rounded-full cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'pending' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending
            {pendingCount > 0 && (
              <span className="bg-foreground text-background text-[10px] font-bold tabular-nums px-1.5 py-px rounded-full">{pendingCount}</span>
            )}
          </button>
        </div>

        <div className="relative w-full lg:w-72 lg:ml-auto">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search name, ID, or email…"
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-[12.5px] text-foreground placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-1 text-[12px] font-semibold">
          {['all', 'faculty', 'student'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-full capitalize transition-colors cursor-pointer ${roleFilter === r
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
            >
              {r === 'all' ? 'All' : `${r}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Roster Tab */}
      {activeTab === 'roster' && (
        <>
          {/* Roster Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead>
                  <tr className="border-b border-border/70 text-[11.5px] font-semibold text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold text-right">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={`roster-skeleton-${i}`} className="animate-pulse" aria-hidden="true">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                            <div className="min-w-0 space-y-1.5">
                              <div className="h-3 w-32 rounded bg-muted" />
                              <div className="h-2.5 w-20 rounded bg-muted/70" />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-3 w-16 rounded bg-muted" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-3 w-40 max-w-full rounded bg-muted" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="h-6 w-20 rounded-full bg-muted ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : (
                  allPeople.map(u => {
                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-4 py-3 flex items-center gap-3 font-semibold text-foreground">
                          <UserAvatar
                            name={u.name}
                            src={u.avatar}
                            className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-[13px] tracking-tight truncate">{u.name}</div>
                            <div className="text-[11px] text-muted-foreground font-normal">{u.department}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {u.studentId || '—'}
                        </td>
                        <td className="px-4 py-3 text-foreground/90 max-w-[220px] truncate">{u.email}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${u.role === 'faculty' || u.role === 'admin'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-muted text-muted-foreground border-border'
                                }`}
                            >
                              <Shield className="w-3 h-3" />
                              <span>{u.role === 'faculty' ? 'Faculty' : u.role === 'admin' ? 'Admin' : 'Student'}</span>
                            </span>
                            {activeRole === 'faculty' && u.role === 'student' && u.id !== activeUser.id && (
                              <button
                                type="button"
                                title={`Remove ${u.name} from course`}
                                aria-label={`Remove ${u.name} from course`}
                                onClick={() => handleRemoveStudent(u)}
                                disabled={isProcessing(`remove:${u.id}`)}
                                className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                              >
                                {isProcessing(`remove:${u.id}`) ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <UserX className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Pending Requests Tab */}
      {activeTab === 'pending' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-subtle">
          {pendingLoading ? (
            <div className="divide-y divide-border" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`pending-skeleton-${i}`} className="p-4 flex items-center justify-between gap-4 animate-pulse">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                    <div className="space-y-1.5 min-w-0">
                      <div className="h-3 w-36 rounded bg-muted" />
                      <div className="h-2.5 w-48 max-w-full rounded bg-muted/70" />
                      <div className="h-2.5 w-20 rounded bg-muted/70" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="h-7 w-20 rounded-lg bg-muted" />
                    <div className="h-7 w-20 rounded-lg bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground font-sans">
              <p className="font-semibold text-foreground mb-1">No Pending Requests</p>
              <p className="text-xs">All enrollment requests have been processed.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingRequests.map(req => {
                const student = db.users.find(u => u.id === req.studentId);
                const typeLabel = req.type === 'self_join' ? 'Join' : req.type === 'faculty_enroll' ? 'Invite' : 'Switch';
                const targetSectionName = req.type === 'section_switch' && req.targetSectionId
                  ? (db.courseSections || []).find((s: any) => s.id === req.targetSectionId)?.name
                  : null;
                return (
                  <div key={req.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center space-x-3">
                      <UserAvatar
                        name={student?.name || 'Student'}
                        src={student?.avatar}
                        className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                      />
                      <div>
                        <div className="text-xs font-bold text-foreground">{student?.name || 'Unknown Student'}</div>
                        <div className="text-[10px] text-muted-foreground font-sans">{student?.email} • Requested {new Date(req.requestedAt).toLocaleDateString()}</div>
                        <div className="text-[10px] font-sans mt-0.5">
                          <span className="font-bold text-primary">{typeLabel}</span>
                          {targetSectionName && <span className="text-muted-foreground"> → {targetSectionName}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {req.type === 'faculty_enroll' ? (
                        <span
                          title="Invitation sent — waiting for the student to accept."
                          className="px-3 py-1.5 text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-500/20"
                        >
                          Awaiting student
                        </span>
                      ) : (
                      <button
                        onClick={() => {
                          if (isProcessing(`approve:${req.id}`) || isProcessing(`reject:${req.id}`)) return;
                          if (req.type === 'section_switch' && req.targetSectionId) {
                            const target = (db.courseSections || []).find((s: any) => s.id === req.targetSectionId);
                            if (target && !canPickSection(target)) {
                              showAlert({
                                title: 'Section Full',
                                message: `Cannot approve — ${target.name} is full. The request is still pending.`,
                                type: 'warning'
                              });
                              return;
                            }
                          }
                          showConfirm(
                            `Approve enrollment for ${student?.name || 'this student'}?`,
                            () => {
                              void run(`approve:${req.id}`, async () => {
                                const ok = await approveEnrollmentRequests([req.id]);
                                if (!ok) return;
                                await reloadPending();
                                showAlert({ title: 'Request Approved', message: `${student?.name || 'Student'} has been enrolled.`, type: 'success' });
                              });
                            },
                            'Approve Enrollment'
                          );
                        }}
                        disabled={isProcessing(`approve:${req.id}`) || isProcessing(`reject:${req.id}`)}
                        className="px-3 py-1.5 text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center gap-1"
                      >
                        {isProcessing(`approve:${req.id}`) && <Loader2 className="w-3 h-3 animate-spin" />}
                        {isProcessing(`approve:${req.id}`) ? 'Approving...' : 'Approve'}
                      </button>
                      )}
                      <button
                        onClick={() => {
                          if (isProcessing(`approve:${req.id}`) || isProcessing(`reject:${req.id}`)) return;
                          showConfirm(
                            `Reject enrollment for ${student?.name || 'this student'}?`,
                            () => {
                              void run(`reject:${req.id}`, async () => {
                                const ok = await rejectEnrollmentRequests([req.id]);
                                if (!ok) return;
                                await reloadPending();
                                showAlert({ title: 'Request Rejected', message: `Enrollment request from ${student?.name || 'student'} has been rejected.`, type: 'warning' });
                              });
                            },
                            'Reject Enrollment'
                          );
                        }}
                        disabled={isProcessing(`approve:${req.id}`) || isProcessing(`reject:${req.id}`)}
                        className="px-3 py-1.5 text-[11px] font-bold bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center gap-1"
                      >
                        {isProcessing(`reject:${req.id}`) && <Loader2 className="w-3 h-3 animate-spin" />}
                        {isProcessing(`reject:${req.id}`) ? 'Rejecting...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Enroll Person */}
      <AnimatedModal
        isOpen={isEnrollModalOpen}
        onClose={() => {
          setIsEnrollModalOpen(false);
          setSelectedStudentIds([]);
          setModalSearchQuery('');
        }}
        panelClassName="w-full max-w-lg bg-card border border-border rounded-3xl shadow-elevated p-6 space-y-4 z-10 flex flex-col max-h-[88vh]"
      >
        {({ startClose }) => (
          <>
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2 border-b border-border/80">
              <div>
                <h3 className="text-base font-bold text-foreground font-sans flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  <span>Enroll Students in Course</span>
                </h3>
                <p className="text-[11px] font-sans text-muted-foreground mt-0.5">
                  Invite student accounts to {course?.code || 'this course'} — they join once they accept
                </p>
              </div>
              <button
                type="button"
                onClick={startClose}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
              <input
                type="text"
                autoFocus
                value={modalSearchQuery}
                onChange={e => setModalSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border/80 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl text-xs font-sans text-foreground placeholder:text-muted-foreground outline-none transition-all"
              />
              {modalSearchQuery && (
                <button
                  type="button"
                  onClick={() => setModalSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selected Student Avatar Bubbles Row */}
            {selectedStudents.length > 0 && (
              <div className="flex items-center space-x-4 overflow-x-auto pb-2 pt-1 scrollbar-none animate-fade-in">
                {selectedStudents.map(student => (
                  <div key={student.id} className="flex flex-col items-center space-y-1.5 shrink-0 group">
                    <div className="relative">
                      <UserAvatar
                        name={student.name}
                        src={student.avatar}
                        className="w-13 h-13 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-border shadow-subtle group-hover:border-primary transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => handleToggleStudent(student.id)}
                        title="Remove"
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-foreground/80 hover:bg-foreground text-background flex items-center justify-center cursor-pointer shadow-md transition-transform active:scale-90"
                      >
                        <X className="w-3 h-3 stroke-[3]" />
                      </button>
                    </div>
                    <span className="text-[11px] font-sans font-medium text-foreground max-w-[64px] truncate text-center">
                      {student.name.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Suggested / Students List Section */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 min-h-[220px] max-h-[360px] pr-1">
              <div className="text-xs font-semibold text-muted-foreground font-sans px-2 pb-1.5">
                Suggested
              </div>

              {filteredModalStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground font-sans space-y-1">
                  <p>No matching student accounts found.</p>
                  {modalSearchQuery && (
                    <p className="text-[11px]">Try adjusting your search keywords.</p>
                  )}
                </div>
              ) : (
                filteredModalStudents.map(student => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  const isAlreadyEnrolled = Boolean(student.enrolledCourseIds?.includes(courseId));

                  return (
                    <div
                      key={student.id}
                      onClick={() => {
                        if (!isAlreadyEnrolled) {
                          handleToggleStudent(student.id);
                        }
                      }}
                      className={`p-2.5 sm:p-3 rounded-2xl flex items-center justify-between transition-all select-none ${
                        isAlreadyEnrolled
                          ? 'opacity-60 cursor-not-allowed bg-muted/20'
                          : 'hover:bg-muted/40 cursor-pointer active:scale-[0.99]'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5 truncate flex-1 min-w-0">
                        <UserAvatar
                          name={student.name}
                          src={student.avatar}
                          className="w-10 h-10 rounded-full object-cover border border-border shrink-0 shadow-xs"
                        />
                        <div className="truncate">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs sm:text-sm font-bold text-foreground font-sans truncate">
                              {student.name}
                            </span>
                            {isAlreadyEnrolled && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-sans font-bold bg-muted text-muted-foreground border border-border">
                                Already Enrolled
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-sans text-muted-foreground truncate">
                            {student.studentId ? `${student.studentId} • ` : ''}{student.email}
                          </p>
                        </div>
                      </div>

                      {/* Circular selection indicator on the right */}
                      <div className="shrink-0 ml-3">
                        {isAlreadyEnrolled ? (
                          <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
                            <Check className="w-3 h-3 stroke-[2]" />
                          </div>
                        ) : isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-primary-sm transition-transform active:scale-95">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/40 hover:border-foreground/60 transition-colors" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-3">
              <span className="text-xs font-sans text-muted-foreground font-medium">
                {selectedStudentIds.length} {selectedStudentIds.length === 1 ? 'student' : 'students'} selected
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={startClose}
                  className="px-4 py-2 text-xs font-bold font-sans text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedStudentIds.length === 0 || enrollBusy}
                  onClick={handleEnrollSelectedStudents}
                  className="px-5 py-2.5 text-xs font-bold font-sans bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-xl transition-all shadow-primary-sm cursor-pointer active:scale-[0.98] flex items-center space-x-2 disabled:cursor-wait"
                >
                  {enrollBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{enrollBusy ? 'Sending...' : 'Send Invitations'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </AnimatedModal>
    </div>
  );
};

export default PeopleView;
