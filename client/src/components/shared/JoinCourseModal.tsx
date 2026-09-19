import React, { useState, useMemo } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import { ModalPortal } from '@/components/shared/ModalPortal';
import { DialogFrame } from '@/components/shared/DialogFrame';
import {
  AlertCircle,
  BookOpen,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface JoinCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateCourse?: (courseId: string) => void;
}

// NOTE: onNavigateCourse is intentionally unused. A successful join only
// creates a pending request, so the modal must not navigate into the course.
export const JoinCourseModal: React.FC<JoinCourseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { db, activeUser, joinCourseByCode, showAlert } = useLMS();
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Live match detection
  const matchedCourse = useMemo(() => {
    const clean = code.trim().toUpperCase();
    if (!clean) return null;
    return db.courses.find(c => c.joinCode?.toUpperCase() === clean) || null;
  }, [code, db.courses]);

  const isAlreadyEnrolled = useMemo(() => {
    if (!matchedCourse) return false;
    return (activeUser.enrolledCourseIds || []).includes(matchedCourse.id);
  }, [matchedCourse, activeUser.enrolledCourseIds]);

  const isAlreadyPending = useMemo(() => {
    if (!matchedCourse) return false;
    return (db.enrollmentRequests || []).some(
      r => r.studentId === activeUser.id && r.courseId === matchedCourse.id && r.status === 'pending'
    );
  }, [matchedCourse, activeUser.id, db.enrollmentRequests]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isJoining) return;
    setErrorMessage(null);

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Please type in a course join code.');
      return;
    }

    setIsJoining(true);
    try {
      const res = await joinCourseByCode(cleanCode);
      if (!res.success) {
        setErrorMessage(res.message);
        return;
      }

      onClose();
      // A successful join only creates a PENDING request — never navigate into
      // the course shell. The student gains access after faculty approval (and
      // section selection); until then every course endpoint returns 403.
      showAlert({
        title: 'Join Request Sent',
        message: res.message,
        type: 'success'
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <ModalPortal>
      <DialogFrame
        title="Join a Course"
        subtitle="Enter the unique join code provided by your instructor."
        onClose={onClose}
      >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input */}
            <div>
              <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                Course join code
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={code}
                  onChange={e => {
                    setCode(e.target.value.toUpperCase());
                    setErrorMessage(null);
                  }}
                  placeholder="e.g. CMSC-170C or GBY-8K21"
                  className="w-full p-3 bg-background border border-border rounded-xl text-foreground font-mono font-bold text-sm tracking-wider uppercase placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-center"
                />
              </div>
              <p className="text-[12px] text-muted-foreground mt-1.5 font-sans">
                Join codes are typically 6-9 characters with a dash (e.g. <span className="font-mono font-semibold text-foreground">CMSC-170C</span>).
              </p>
            </div>

            {/* Real-time Match Preview */}
            {matchedCourse && (
              <div className={`p-3 rounded-xl border transition-all text-xs font-sans ${
                isAlreadyEnrolled
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                  : 'bg-primary/5 border-primary/20 text-foreground'
              }`}>
                <div className="flex items-center space-x-2 pb-1.5 border-b border-border/40">
                  <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-bold text-foreground truncate">
                    {matchedCourse.code} • {matchedCourse.section}
                  </span>
                </div>
                <div className="mt-1 font-semibold truncate text-foreground">
                  {matchedCourse.title}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-between">
                  <span>Instructor: {matchedCourse.instructorName}</span>
                  {isAlreadyPending ? (
                    <span className="font-bold text-amber-600 dark:text-amber-400">Request Pending</span>
                  ) : isAlreadyEnrolled ? (
                    <span className="font-bold text-amber-600 dark:text-amber-400">Already Joined</span>
                  ) : (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Ready to Request</span>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!code.trim() || isAlreadyEnrolled || isAlreadyPending || isJoining}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${
                  !code.trim() || isAlreadyEnrolled || isAlreadyPending || isJoining
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary-sm cursor-pointer'
                } ${isJoining ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isJoining && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isJoining ? 'Sending...' : 'Join Course'}</span>
                {!isJoining && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </form>
      </DialogFrame>
    </ModalPortal>
  );
};
