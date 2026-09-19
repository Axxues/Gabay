import React, { useEffect, useRef } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import {
  X,
  LogOut,
  Mail,
  Building,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  Layers
} from 'lucide-react';
import { ModalPortal, useModalAnimate } from '@/components/shared/ModalPortal';
import { UserAvatar } from '@/components/shared/UserAvatar';

export const UserProfileModal: React.FC = () => {
  const {
    isUserProfileModalOpen,
    setIsUserProfileModalOpen,
    currentUser,
    logout,
    activeRole,
    db,
    showConfirm
  } = useLMS();

  const modalRef = useRef<HTMLDivElement>(null);
  const { isClosing, startClose } = useModalAnimate(() => setIsUserProfileModalOpen(false), 200);

  useEffect(() => {
    if (!isUserProfileModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        startClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserProfileModalOpen, startClose]);

  if (!isUserProfileModalOpen || !currentUser) return null;

  const roleBadges: Record<string, { label: string; style: string; icon: React.ReactNode }> = {
    admin: {
      label: 'DEAN / ACADEMIC ADMIN',
      style: 'bg-primary/10 text-primary border-primary/20',
      icon: <Building className="w-3.5 h-3.5" />
    },
    faculty: {
      label: 'FACULTY INSTRUCTOR',
      style: 'bg-primary/10 text-primary border-primary/20',
      icon: <UserCheck className="w-3.5 h-3.5" />
    },
    staff: {
      label: 'REGISTRAR / STAFF',
      style: 'bg-primary/10 text-primary border-primary/20',
      icon: <ShieldCheck className="w-3.5 h-3.5" />
    },
    student: {
      label: 'UNDERGRADUATE STUDENT',
      style: 'bg-primary/10 text-primary border-primary/20',
      icon: <GraduationCap className="w-3.5 h-3.5" />
    }
  };

  const badge = roleBadges[activeRole] || roleBadges.student;

  const userCourses = db.courses.filter(c => {
    if (activeRole === 'student') return (currentUser.enrolledCourseIds || []).includes(c.id);
    if (activeRole === 'faculty') return c.instructorId === currentUser.id;
    return true;
  });

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] overflow-hidden flex items-center justify-center p-4 select-none">
        {/* Backdrop */}
        <div
          className={`fixed inset-0 overlay-backdrop cursor-pointer ${
            isClosing ? 'animate-fade-out' : 'animate-fade-in'
          }`}
          onClick={() => startClose()}
        />

        {/* Modal Card */}
        <div
          ref={modalRef}
          className={`w-full max-w-lg bg-card border border-border rounded-2xl shadow-elevated overflow-hidden z-10 flex flex-col ${
            isClosing ? 'animate-scale-out' : 'animate-scale-in'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header with Cover */}
          <div className="h-24 bg-gradient-to-r from-primary via-pink-700 to-slate-900 relative p-4 flex justify-between items-start">
            <span className="px-2.5 py-0.5 text-[10px] font-sans font-bold uppercase bg-black/40 text-white rounded-md backdrop-blur-md border border-white/10">
              User Profile
            </span>
            <button
              onClick={() => startClose()}
              className="p-1 rounded-lg bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Content */}
          <div className="p-6 pt-0 relative space-y-5">
            {/* Avatar and Info Header */}
            <div className="flex items-end justify-between -mt-10">
              <UserAvatar
                name={currentUser.name}
                src={currentUser.avatar}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-card shadow-elevated"
              />
              <div className={`px-3 py-1 text-xs font-sans font-bold rounded-lg border flex items-center space-x-1.5 ${badge.style}`}>
                {badge.icon}
                <span>{badge.label}</span>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                {currentUser.name}
              </h2>
              <p className="text-xs text-muted-foreground font-sans mt-0.5">
                {currentUser.title} • {currentUser.department}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                <div className="flex items-center space-x-1.5 text-muted-foreground font-medium">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>Email Address</span>
                </div>
                <div className="font-sans text-foreground font-semibold truncate text-[11px]">
                  {currentUser.email}
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                <div className="flex items-center space-x-1.5 text-muted-foreground font-medium">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  <span>ID Number</span>
                </div>
                <div className="font-sans text-foreground font-semibold text-[11px]">
                  {currentUser.studentId || 'Not assigned'}
                </div>
              </div>
            </div>

            {/* Enrolled Courses Summary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <div className="flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Active Course Attachments ({userCourses.length})</span>
                </div>
                <span className="text-[10px] font-sans text-muted-foreground">1st Sem AY 2026-2027</span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {userCourses.map(course => (
                  <div
                    key={course.id}
                    className="p-2.5 rounded-xl border border-border bg-card/60 flex items-center justify-between text-xs hover:border-primary/40 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-foreground text-[11px]">{course.code}: {course.title}</div>
                      <div className="text-[10px] font-sans text-muted-foreground">{course.section} • {course.credits} Units</div>
                    </div>
                    <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      Enrolled
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-3 bg-muted/30 rounded-xl border border-border text-[11px] text-muted-foreground font-sans leading-relaxed">
              Active authenticated session with role-based access control.
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <button
                onClick={() => startClose()}
                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
              >
                Close Window
              </button>

              <button
                onClick={() => {
                  showConfirm("Are you sure you want to sign out of GABAY LMS?", () => {
                    startClose(() => logout());
                  }, "Sign Out");
                }}
                className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground rounded-xl transition-all shadow-primary-sm flex items-center space-x-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Session</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
