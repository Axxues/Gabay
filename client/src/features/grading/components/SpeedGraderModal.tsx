import React, { useState, useEffect } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import { X, ChevronLeft, ChevronRight, Award, MessageSquare, FileText, CheckCircle2 } from 'lucide-react';
import { ModalPortal, useModalAnimate } from '@/components/shared/ModalPortal';

interface SpeedGraderContentProps {
  currentSubmission: NonNullable<ReturnType<typeof useLMS>['db']['submissions'][number]>;
  db: ReturnType<typeof useLMS>['db'];
  isAdmin: boolean;
  isClosing: boolean;
  startClose: () => void;
  openSpeedGrader: (subId: string) => void;
  gradeSubmission: ReturnType<typeof useLMS>['gradeSubmission'];
}

interface ResolvedAssessment {
  title?: string;
  pointsPossible: number;
  rubric: Array<{ id: string; title: string; description: string; points: number; ratings: Array<{ points: number; description: string }> }>;
  questions: Array<{ id: string; text: string; type: string; points: number; correctAnswer?: string; options?: string[] }>;
}

/**
 * Submissions from question-set quizzes/activities/exams carry synthetic
 * activityKeys (`asg-quiz-<id>` / `asg-activity-<id>` / `asg-exam-<id>`)
 * with no classic Activity row. Resolve the source row (activity, quiz, or
 * exam) so title, points, rubric, and questions render correctly.
 */
const resolveAssessment = (
  submission: SpeedGraderContentProps['currentSubmission'],
  db: SpeedGraderContentProps['db'],
): ResolvedAssessment => {
  const key = submission.activityKey ?? '';
  const raw = submission as unknown as { quizId?: string; activityId?: string; examId?: string };
  const strip = (prefix: string) => (key.startsWith(prefix) ? key.slice(prefix.length) : null);

  const asgActivityId = strip('asg-activity-');
  const asgQuizId = strip('asg-quiz-');
  const asgExamId = strip('asg-exam-');

  const activity =
    (db.activities ?? []).find(a => a.id === key) ??
    (asgActivityId ? (db.activities ?? []).find(a => a.id === asgActivityId) : undefined) ??
    (raw.activityId ? (db.activities ?? []).find(a => a.id === raw.activityId) : undefined);
  if (activity) {
    return {
      title: activity.title,
      pointsPossible: activity.pointsPossible,
      rubric: activity.rubric ?? [],
      questions: (activity.questions ?? []).map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        correctAnswer: q.correctAnswer,
        options: q.options,
      })),
    };
  }

  const quizId = asgQuizId ?? raw.quizId;
  const quiz = quizId ? (db.quizzes ?? []).find(q => q.id === quizId) : undefined;
  if (quiz) {
    const points = quiz.questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 100;
    return {
      title: quiz.title,
      pointsPossible: points,
      rubric: [],
      questions: (quiz.questions ?? []).map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        correctAnswer: q.correctAnswer,
        options: q.options,
      })),
    };
  }

  const examId = asgExamId ?? raw.examId;
  const exam = examId ? (db.exams ?? []).find(e => e.id === examId) : undefined;
  if (exam) {
    const points = exam.questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 100;
    return {
      title: exam.title,
      pointsPossible: points,
      rubric: [],
      questions: (exam.questions ?? []).map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        correctAnswer: q.correctAnswer,
        options: q.options,
      })),
    };
  }

  return { title: undefined, pointsPossible: 100, rubric: [], questions: [] };
};

/** Question-set submissions store answers as a JSON object in `content`. */
const parseAnswerMap = (content?: string): Record<string, string> | null => {
  if (!content || content.trim().startsWith('<')) return null;
  try {
    const parsed: unknown = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // Plain-text submission — rendered verbatim below.
  }
  return null;
};

const SpeedGraderContent: React.FC<SpeedGraderContentProps> = ({
  currentSubmission,
  db,
  isAdmin,
  isClosing,
  startClose,
  openSpeedGrader,
  gradeSubmission,
}) => {
  const assessment = resolveAssessment(currentSubmission, db);
  const course = db.courses.find(c => c.id === currentSubmission.courseId);

  const activitySubmissions = db.submissions
    .filter(s => s.activityKey === currentSubmission.activityKey)
    .sort((a, b) => {
      const t = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      if (t !== 0) return t;
      return a.studentName.localeCompare(b.studentName);
    });
  const currentIndex = activitySubmissions.findIndex(s => s.id === currentSubmission.id);

  const [gradeText, setGradeText] = useState<string>(String(currentSubmission.grade ?? 0));
  const [rubricScores, setRubricScores] = useState<Record<string, number>>(currentSubmission.rubricScores || {});
  const [newComment, setNewComment] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset only when navigating to a different submission. Depending on
  // grade/rubricScores here would wipe unsaved faculty input whenever any
  // background db refresh lands mid-typing.
  useEffect(() => {
    setGradeText(String(currentSubmission.grade ?? 0));
    setRubricScores(currentSubmission.rubricScores || {});
    setIsSaved(false);
    setIsSaving(false);
  }, [currentSubmission.id]);

  const pointsPossible = assessment.pointsPossible;
  const parsedGrade = Number(gradeText);
  const isGradeValid = gradeText.trim() !== '' && Number.isFinite(parsedGrade);
  const clampedGrade = isGradeValid ? Math.min(Math.max(parsedGrade, 0), pointsPossible) : 0;

  const handleRubricScoreChange = (rubricId: string, score: number) => {
    if (isAdmin) return;
    const updated = { ...rubricScores, [rubricId]: score };
    setRubricScores(updated);

    const total = Object.values(updated).reduce((acc, curr) => acc + curr, 0);
    setGradeText(String(Math.min(total, pointsPossible)));
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin || isSaving || !isGradeValid) return;
    setIsSaving(true);
    try {
      await gradeSubmission(
        currentSubmission.id,
        clampedGrade,
        rubricScores,
        newComment.trim() ? newComment : undefined
      );
      setGradeText(String(clampedGrade));
      setNewComment('');
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch {
      // gradeSubmission already surfaced the alert.
    } finally {
      setIsSaving(false);
    }
  };

  const answerMap = parseAnswerMap(currentSubmission.content);
  const showQuestionAnswers = answerMap !== null && assessment.questions.length > 0;

  return (
    <ModalPortal>
      <div className={`fixed inset-0 z-[100] overflow-hidden overlay-backdrop flex flex-col ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}>
      {/* SpeedGrader Top Header - Cellwego Glass style */}
      <header className="h-14 bg-card/90 backdrop-blur-xl border-b border-border px-6 flex items-center justify-between text-foreground shrink-0 select-none shadow-subtle">
        <div className="flex items-center space-x-3">
          <div className="px-2.5 py-1 text-xs font-sans font-bold bg-primary/10 text-primary rounded-lg border border-primary/20">
            SpeedGrader™ Workspace
          </div>
          {isAdmin && (
            <span className="px-2.5 py-0.5 text-[11px] font-sans font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-500/20">
              Read-Only Audit Mode
            </span>
          )}
          <span className="text-muted-foreground/60">|</span>
          <span className="font-bold text-sm text-foreground">{assessment.title ?? 'Untitled assessment'}</span>
          <span className="text-xs font-sans text-muted-foreground">({course?.code})</span>
        </div>

        {/* Student Navigator */}
        <div className="flex items-center space-x-3">
          <button
            disabled={currentIndex <= 0}
            onClick={() => {
              if (currentIndex > 0) {
                const prevSub = activitySubmissions[currentIndex - 1];
                openSpeedGrader(prevSub.id);
              }
            }}
            className="p-1.5 rounded-lg bg-card border border-border disabled:opacity-30 hover:bg-muted transition-colors shadow-soft"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center font-sans text-xs">
            <span className="font-bold text-foreground">{currentSubmission.studentName}</span>
            <span className="text-muted-foreground ml-2">({currentIndex + 1} of {activitySubmissions.length})</span>
          </div>

          <button
            disabled={currentIndex >= activitySubmissions.length - 1}
            onClick={() => {
              if (currentIndex < activitySubmissions.length - 1) {
                const nextSub = activitySubmissions[currentIndex + 1];
                openSpeedGrader(nextSub.id);
              }
            }}
            className="p-1.5 rounded-lg bg-card border border-border disabled:opacity-30 hover:bg-muted transition-colors shadow-soft"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => startClose()}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg bg-card hover:bg-muted border border-border ml-4 transition-colors shadow-soft cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Split View Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Student Document Preview */}
        <div className="flex-1 bg-background p-6 overflow-y-auto flex flex-col space-y-4">
          <div className="p-4 bg-card border border-border rounded-xl flex items-center justify-between text-xs text-foreground shadow-subtle">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <div className="font-bold text-foreground">{currentSubmission.fileName || 'Submission Document'}</div>
                <div className="font-sans text-[11px] text-muted-foreground">
                  Submitted: {new Date(currentSubmission.submittedAt).toLocaleString()}
                </div>
              </div>
            </div>
            {currentSubmission.fileUrl ? (
              <a
                href={currentSubmission.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-bold font-sans border border-border transition-colors"
              >
                Download attached file
              </a>
            ) : (
              <span className="px-3.5 py-1.5 text-muted-foreground rounded-lg text-xs font-sans border border-border">
                {currentSubmission.submissionType === 'file' ? 'No file attached' : 'Text entry submission'}
              </span>
            )}
          </div>

          {/* Render Document Box */}
          <div className="flex-1 bg-card border border-border rounded-xl p-6 font-sans text-xs text-foreground leading-relaxed overflow-y-auto whitespace-pre-line shadow-inner">
            <div className="text-muted-foreground pb-2 mb-4 border-b border-border flex justify-between items-center text-[10px]">
              <span>GABAY DOCVIEWER ENGINE v2.4 • STUDENT PAYLOAD RENDERER</span>
              <span>{currentSubmission.studentName}{currentSubmission.studentId ? ` (${currentSubmission.studentId})` : ''}</span>
            </div>
            {showQuestionAnswers ? (
              <div className="space-y-3">
                {(assessment.questions ?? []).map((q, idx) => {
                  const answer = answerMap?.[q.id] ?? '';
                  const isCorrect = q.correctAnswer !== undefined && q.correctAnswer !== ''
                    ? answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
                    : null;
                  return (
                    <div key={q.id} className="p-3 bg-muted/30 border border-border rounded-xl space-y-1.5">
                      <div className="flex justify-between gap-2 text-foreground">
                        <span className="font-bold">Q{idx + 1}. {q.text || `Question ${idx + 1}`}</span>
                        <span className="font-sans text-muted-foreground shrink-0">{q.points} pts</span>
                      </div>
                      <div className="text-foreground">
                        <span className="text-muted-foreground">Answer: </span>
                        <span className="font-semibold">{answer === '' ? '(no answer)' : answer}</span>
                      </div>
                      {isCorrect !== null && (
                        <div className={`font-sans ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {isCorrect ? '✓ Matches key' : `Key: ${q.correctAnswer}`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : currentSubmission.content ? (
              <div className="whitespace-pre-line">{currentSubmission.content}</div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                [PDF Simulated Canvas DocViewer Markup Rendering]
                <br />
                File attached: {currentSubmission.fileName ?? 'none'}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Pane: Rubric & Score Input */}
        <div className="w-96 bg-card border-l border-border p-6 overflow-y-auto space-y-6 text-xs text-foreground shrink-0 shadow-lifted animate-slide-in-right">
          <form onSubmit={handleSaveGrade} className="space-y-6">
            {/* Numerical Score Entry */}
            <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                  Assessment Score:
                </span>
                <span className="font-sans text-muted-foreground">
                  out of {pointsPossible} pts
                </span>
              </div>
              <input
                type="number"
                min={0}
                max={pointsPossible}
                value={gradeText}
                disabled={isAdmin || isSaving}
                onChange={e => setGradeText(e.target.value)}
                aria-invalid={!isGradeValid}
                className="w-full p-2.5 bg-card border border-border rounded-xl font-sans text-xl font-extrabold text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/30 text-center shadow-subtle disabled:opacity-75 disabled:cursor-not-allowed"
              />
              {!isGradeValid && !isAdmin && (
                <p className="font-sans text-[11px] text-rose-600 dark:text-rose-400">Enter a number between 0 and {pointsPossible}.</p>
              )}
            </div>

            {/* Rubric Criteria */}
            {assessment.rubric && assessment.rubric.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-1.5 font-bold text-foreground uppercase tracking-wider text-[11px]">
                  <Award className="w-4 h-4 text-emerald-500" />
                  <span>CHED SpeedGrader Rubric</span>
                </div>

                <div className="space-y-3">
                  {assessment.rubric.map(r => (
                    <div key={r.id} className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-2">
                      <div className="flex justify-between font-bold text-foreground">
                        <span>{r.title}</span>
                        <span className="font-sans text-emerald-600 dark:text-emerald-400">
                          {rubricScores[r.id] ?? 0} / {r.points} pts
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{r.description}</p>

                      <div className="grid grid-cols-1 gap-1.5 pt-1">
                        {r.ratings.map((rating, ratingIdx) => (
                          <button
                            key={`${r.id}-${ratingIdx}-${rating.points}`}
                            type="button"
                            disabled={isAdmin}
                            onClick={() => handleRubricScoreChange(r.id, rating.points)}
                            className={`p-2.5 rounded-lg text-left border text-[11px] transition-all ${
                              rubricScores[r.id] === rating.points
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-bold shadow-soft'
                                : 'bg-card text-muted-foreground border-border hover:border-border/80'
                            } ${isAdmin ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                          >
                            <div className="flex justify-between font-sans">
                              <span>{rating.description}</span>
                              <span className="ml-1">{rating.points} pts</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Comments */}
            <div className="space-y-3">
              <div className="flex items-center space-x-1.5 font-bold text-foreground uppercase tracking-wider text-[11px]">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <span>Activity Feedback Comments</span>
              </div>

              {[...(currentSubmission.comments ?? [])]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(c => (
                <div key={c.id} className="p-3 bg-muted/40 border border-border rounded-xl space-y-1">
                  <div className="flex justify-between text-[10px] font-sans text-muted-foreground">
                    <span className="font-bold text-foreground">{c.authorName}</span>
                    <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-foreground leading-normal italic">{c.text}</p>
                </div>
              ))}

              {!isAdmin && (
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add private evaluation comment for student..."
                  className="w-full p-3 bg-card border border-border rounded-xl font-sans text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30 shadow-subtle"
                />
              )}
            </div>

            {/* Save Grade Button */}
            {!isAdmin ? (
              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={isSaving || !isGradeValid}
                  className="w-full py-3 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-primary-sm flex items-center justify-center space-x-2 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSaving ? 'Saving…' : 'Submit Final Grade & Feedback'}</span>
                </button>
                {isSaved && (
                  <div className="text-center font-sans text-[11px] text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                    Grade and rubric updated in GABAY database!
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-muted/40 border border-border rounded-xl text-center font-sans text-xs text-muted-foreground">
                🔒 SpeedGrader is in read-only audit mode for administrators.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

export const SpeedGraderModal: React.FC = () => {
  const {
    activeSpeedGraderSubmissionId,
    closeSpeedGrader,
    openSpeedGrader,
    db,
    gradeSubmission,
    activeRole,
  } = useLMS();

  const isAdmin = activeRole === 'admin';
  const { isClosing, startClose } = useModalAnimate(closeSpeedGrader, 200);

  useEffect(() => {
    if (!activeSpeedGraderSubmissionId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        startClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSpeedGraderSubmissionId, startClose]);

  if (!activeSpeedGraderSubmissionId) return null;

  const currentSubmission = db.submissions.find(s => s.id === activeSpeedGraderSubmissionId);
  if (!currentSubmission) return null;

  // Remount per submission so grade/rubric/comment state never flashes
  // the previous student's values while navigating.
  return (
    <SpeedGraderContent
      key={currentSubmission.id}
      currentSubmission={currentSubmission}
      db={db}
      isAdmin={isAdmin}
      isClosing={isClosing}
      startClose={startClose}
      openSpeedGrader={openSpeedGrader}
      gradeSubmission={gradeSubmission}
    />
  );
};

