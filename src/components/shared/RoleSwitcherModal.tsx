import React, { useEffect } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import type { UserRole } from '@/services/lms/types/lms.types';
import { ShieldCheck, UserCheck, GraduationCap, Building, X, AlertTriangle } from 'lucide-react';
import { ModalPortal, useModalAnimate } from '@/components/shared/ModalPortal';

export const RoleSwitcherModal: React.FC = () => {
  const { isRoleModalOpen, setIsRoleModalOpen, activeRole, switchRole } = useLMS();
  const { isClosing, startClose } = useModalAnimate(() => setIsRoleModalOpen(false), 200);

  useEffect(() => {
    if (!isRoleModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        startClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRoleModalOpen, startClose]);

  if (!isRoleModalOpen) return null;

  const roles: {
    role: UserRole;
    title: string;
    personName: string;
    studentId?: string;
    icon: React.ReactNode;
    badgeColor: string;
    scope: string;
    allowed: string;
    restrictions: string;
  }[] = [
    {
      role: 'admin',
      title: '1. Administrator (Dean / Chair)',
      personName: 'Dean 1',
      icon: <Building className="w-5 h-5 text-primary" />,
      badgeColor: 'bg-primary/10 text-primary border-primary/20',
      scope: 'College-wide visibility across all course shells, instructors & enrollments.',
      allowed: 'Course auditing, syllabus compliance matrix, curriculum management, read-only gradebook inspect.',
      restrictions: 'Cannot modify grades directly into an instructor\'s active gradebook.'
    },
    {
      role: 'faculty',
      title: '2. Faculty Member (Instructor)',
      personName: 'Faculty 1',
      icon: <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
      scope: 'Assigned course sections (CMSC 131, CMSC 150, CMSC 170).',
      allowed: 'Course authoring (Modules, Activities, Quizzes), SpeedGrader submission review, Gradebook editing, advising scheduler.',
      restrictions: 'Zero visibility into gradebooks or private drafts handled by other instructors.'
    },
    {
      role: 'staff',
      title: '3. Non-Teaching Staff (Registrar)',
      personName: 'Staff 1',
      icon: <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      scope: 'College student directory, section placements & official roster records.',
      allowed: 'Enrollment verification, roster audits, transcript hold notifications, course catalog inspect.',
      restrictions: 'Zero access to grading tools, LMS content editors, or direct quiz authoring.'
    },
    {
      role: 'student',
      title: '4. Enrolled Student',
      personName: 'Student 1',
      studentId: '2022-00412-SLUC',
      icon: <GraduationCap className="w-5 h-5 text-primary" />,
      badgeColor: 'bg-primary/10 text-primary border-primary/20',
      scope: 'Personal course enrollments, active activity submissions & individual grade records.',
      allowed: 'Module navigation, activity submission, online quiz attempts, What-If grade calculation, faculty consultation booking.',
      restrictions: 'Zero access to other students\' grades, course settings, or SpeedGrader.'
    }
  ];

  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center p-4 overlay-backdrop cursor-pointer ${
          isClosing ? 'animate-fade-out' : 'animate-fade-in'
        }`}
        onClick={() => startClose()}
      >
        <div
          className={`w-full max-w-3xl bg-card border border-border rounded-2xl shadow-elevated overflow-hidden flex flex-col max-h-[90vh] ${
            isClosing ? 'animate-scale-out' : 'animate-scale-in'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 text-xs font-sans font-bold bg-muted text-foreground rounded-md border border-border">
                  GABAY RBAC SESSION
                </span>
                <h2 className="text-lg font-bold text-foreground">
                  Role Switcher
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select a role to test specific view scopes, permissions, and LMS features.
              </p>
            </div>
            <button
              onClick={() => startClose()}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map(r => {
                const isSelected = activeRole === r.role;
                return (
                  <div
                    key={r.role}
                    onClick={() => {
                      switchRole(r.role);
                      startClose();
                    }}
                    className={`cursor-pointer rounded-xl border p-4 card-hover transition-all duration-200 relative ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-primary-sm'
                        : 'border-border bg-card shadow-subtle'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-muted rounded-xl border border-border">
                          {r.icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-foreground">
                            {r.title}
                          </h3>
                          <p className="text-xs font-medium text-foreground/80 mt-0.5">
                            {r.personName} {r.studentId && <span className="font-sans text-xs text-muted-foreground">({r.studentId})</span>}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-primary text-primary-foreground rounded-md shadow-subtle">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <div className="mt-3.5 space-y-1.5 text-xs">
                      <div className="flex items-start space-x-1.5 text-muted-foreground">
                        <span className="font-bold text-foreground shrink-0">Scope:</span>
                        <span>{r.scope}</span>
                      </div>
                      <div className="flex items-start space-x-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                        <span className="font-bold shrink-0">Allowed:</span>
                        <span>{r.allowed}</span>
                      </div>
                      <div className="flex items-start space-x-1.5 text-amber-700 dark:text-amber-400 font-medium">
                        <span className="font-bold shrink-0">Rules:</span>
                        <span>{r.restrictions}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 border-t border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center text-xs text-muted-foreground space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>GABAY System Security Guard: Enforces RA 10173 Data Privacy Act.</span>
            </div>
            <button
              onClick={() => startClose()}
              className="px-4 py-2 text-xs font-bold text-foreground hover:bg-muted rounded-xl transition-colors border border-border cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
