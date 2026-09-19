import React, { useState, useEffect } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import type { Exam, QuizQuestion, TermId } from '@/services/lms/types/lms.types';
import { normalizeTermId } from '@/utils/gradingTerms';
import { TERM_LABELS, TermFilterSelect } from '@/components/shared/TermSelect';
import {
  HelpCircle,
  Play,
  Check,
  CheckCircle2,
  Clock,
  Plus,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers
} from 'lucide-react';
import { CreateExamPage } from './CreateExamPage';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';

interface ExamsViewProps {
  courseId: string;
  selectedExamId?: string | null;
  onSelectExam?: (examId: string | null) => void;
  onBackToModules?: () => void;
}

export const ExamsView: React.FC<ExamsViewProps> = ({
  courseId,
  selectedExamId,
  onSelectExam,
  onBackToModules
}) => {
  const {
    activeRole,
    activeUser,
    db,
    isLoading,
    isSyncing,
    recordExamSubmission,
    effectiveTermsForCourse
  } = useLMS() as ReturnType<typeof useLMS> & { effectiveTermsForCourse?: (courseId: string) => TermId[] };

  const courseExams = (db.exams || []).filter(q => q.courseId === courseId);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Full page Create Exam state
  const [isCreatingExam, setIsCreatingExam] = useState(false);

  // Grading-term filter for the list (legacy 'final' rows read as 'finals').
  // Options follow the scanned syllabus via effectiveTermsForCourse.
  const effectiveTerms: TermId[] =
    courseId && typeof effectiveTermsForCourse === 'function'
      ? effectiveTermsForCourse(courseId)
      : ['prelim', 'midterm', 'finals'];
  const [termFilter, setTermFilter] = useState<'all' | TermId>('all');
  useEffect(() => {
    if (termFilter !== 'all' && !effectiveTerms.includes(termFilter)) setTermFilter('all');
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleExams = termFilter === 'all'
    ? courseExams
    : courseExams.filter(e => (normalizeTermId(e.term) ?? 'midterm') === termFilter);

  // Sync activeExam when selectedExamId changes (e.g. from Modules navigation)
  useEffect(() => {
    if (selectedExamId) {
      const q = courseExams.find(item => item.id === selectedExamId);
      if (q) {
        setActiveExam(q);
        setUserAnswers({});
        setExamSubmitted(false);
        setScore(null);
        setCurrentPageIndex(0);
      }
    }
  }, [selectedExamId, courseId]);

  const handleStartExam = (exam: Exam) => {
    setActiveExam(exam);
    setUserAnswers({});
    setExamSubmitted(false);
    setScore(null);
    setCurrentPageIndex(0);
  };

  const handleSelectAnswer = (qId: string, ans: string) => {
    setUserAnswers(prev => ({ ...prev, [qId]: ans }));
  };

  // Divide active exam questions into Google Forms-style pages
  const getExamPages = (exam: Exam): { sectionTitle?: string; sectionDesc?: string; items: QuizQuestion[] }[] => {
    const pages: { sectionTitle?: string; sectionDesc?: string; items: QuizQuestion[] }[] = [];
    let currentItems: QuizQuestion[] = [];
    let currentTitle = exam.title;
    let currentDesc = exam.instructions;

    exam.questions.forEach((q) => {
      if (q.type === 'page_break') {
        pages.push({
          sectionTitle: currentTitle,
          sectionDesc: currentDesc,
          items: currentItems
        });
        currentItems = [];
        currentTitle = q.text || 'Next Section';
        currentDesc = q.description || '';
      } else {
        currentItems.push(q);
      }
    });

    pages.push({
      sectionTitle: currentTitle,
      sectionDesc: currentDesc,
      items: currentItems
    });

    return pages;
  };

  const handleSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExam) return;

    let totalPoints = 0;
    let earnedPoints = 0;

    activeExam.questions.forEach(q => {
      if (q.type === 'description' || q.type === 'page_break') return;

      const qPts = q.points || 0;
      totalPoints += qPts;
      const userAns = (userAnswers[q.id] || '').trim();

      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        if (userAns === (q.correctAnswer || '').trim()) {
          earnedPoints += qPts;
        }
      } else if (q.type === 'identification') {
        if (userAns.toLowerCase() === (q.correctAnswer || '').trim().toLowerCase()) {
          earnedPoints += qPts;
        }
      } else if (q.type === 'essay') {
        // Essays receive partial credit or full completion points during automated submission
        if (userAns.length > 10) {
          earnedPoints += qPts;
        }
      }
    });

    const calculatedScore = Math.round((earnedPoints / (totalPoints || 1)) * 100);
    setScore(calculatedScore);
    setExamSubmitted(true);

    // Save submission to database (instant feedback above keeps using the
    // client-side scorer; the cached server row feeds SpeedGrader).
    try {
      await recordExamSubmission(activeExam.id, activeUser.id, userAnswers);
    } catch {
      // recordExamSubmission already surfaced the alert.
    }
  };

  // If creating exam, render full dedicated page
  if (isCreatingExam) {
    return (
      <CreateExamPage
        courseId={courseId}
        onBack={() => setIsCreatingExam(false)}
        onExamCreated={newExamId => {
          setIsCreatingExam(false);
          const createdQ = (db.exams || []).find(q => q.id === newExamId);
          if (createdQ) {
            setActiveExam(createdQ);
            setCurrentPageIndex(0);
          }
        }}
      />
    );
  }

  // Exam runner modal/screen
  if (activeExam) {
    const examPages = getExamPages(activeExam);
    const currentPage = examPages[currentPageIndex] || examPages[0];
    const totalPages = examPages.length;
    const progressPercent = Math.round(((currentPageIndex + 1) / totalPages) * 100);

    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in font-sans pb-16">
        <button
          type="button"
          onClick={() => {
            setActiveExam(null);
            if (onBackToModules) {
              onBackToModules();
            } else if (onSelectExam) {
              onSelectExam(null);
            }
          }}
          className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center space-x-1.5 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>{onBackToModules ? 'Back to Modules' : 'Back to Exams List'}</span>
        </button>

        {/* Top Header Card */}
        <div className="bg-card border border-border border-t-4 border-t-primary rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-4">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 text-[11px] font-sans font-semibold bg-muted text-muted-foreground rounded-full border border-border">
                Assessment runner
              </span>
              <h1 className="text-[22px] sm:text-[28px] leading-tight font-extrabold tracking-tight text-foreground mt-2">
                {activeExam.title}
              </h1>
              <p className="text-[13px] text-muted-foreground font-sans mt-1 leading-relaxed">
                {activeExam.instructions}
              </p>
            </div>

            {examSubmitted && score !== null && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-right shrink-0">
                <div className="text-[11px] font-sans font-semibold text-emerald-700 dark:text-emerald-400">
                  Automated evaluation
                </div>
                <div className="text-3xl font-extrabold font-sans text-emerald-700 dark:text-emerald-400">
                  {score}%
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-sans font-medium mt-0.5 flex items-center justify-end space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Recorded in gradebook</span>
                </div>
              </div>
            )}
          </div>

          {/* Exam Metadata & Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[12px] text-muted-foreground font-sans">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1.5 font-semibold text-foreground">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{activeExam.timeLimitMinutes} mins</span>
                </span>
                <span>·</span>
                <span>
                  {activeExam.questions.filter(q => q.type !== 'description' && q.type !== 'page_break').length} questions
                </span>
                <span>·</span>
                <span className="font-semibold text-foreground">
                  {activeExam.questions.reduce((sum, q) => sum + (q.points || 0), 0)} total points
                </span>
              </div>

              {totalPages > 1 && !examSubmitted && (
                <span className="text-[11px] font-bold text-primary">
                  Page {currentPageIndex + 1} of {totalPages}
                </span>
              )}
            </div>

            {/* Google Forms Section Progress Bar */}
            {totalPages > 1 && !examSubmitted && (
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Section / Paginated Content */}
        {!examSubmitted ? (
          <form onSubmit={handleSubmitExam} className="space-y-6">
            {/* If section title differs from exam title, show Section Banner */}
            {currentPage.sectionTitle && currentPage.sectionTitle !== activeExam.title && (
              <div className="p-5 bg-card border border-border rounded-2xl space-y-1">
                <div className="flex items-center space-x-2 text-muted-foreground font-semibold text-[12px]">
                  <Layers className="w-4 h-4" />
                  <span>Section {currentPageIndex + 1}</span>
                </div>
                <h3 className="text-[14px] font-bold tracking-tight text-foreground">
                  {currentPage.sectionTitle}
                </h3>
                {currentPage.sectionDesc && (
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    {currentPage.sectionDesc}
                  </p>
                )}
              </div>
            )}

            {/* Current Page Question & Card Items */}
            <div className="space-y-5">
              {currentPage.items.map(q => {
                const questionNumber = activeExam.questions
                  .slice(0, activeExam.questions.indexOf(q) + 1)
                  .filter(item => item.type !== 'description' && item.type !== 'page_break').length;

                // 1. Description Card (Info block)
                if (q.type === 'description') {
                  return (
                    <div
                      key={q.id}
                      className="p-5 bg-muted/40 border border-border rounded-2xl space-y-2"
                    >
                      <div className="flex items-center space-x-2 text-muted-foreground font-semibold text-[12px]">
                        <FileText className="w-4 h-4" />
                        <span>{q.text}</span>
                      </div>
                      {q.description && (
                        <p className="text-xs text-foreground/90 font-sans leading-relaxed whitespace-pre-wrap">
                          {q.description}
                        </p>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={q.id}
                    className="p-5 bg-card rounded-2xl border border-border space-y-4"
                  >
                    {/* Question Header */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-1">
                        <span className="text-[11.5px] font-semibold text-muted-foreground">
                          Question {questionNumber} · {q.type === 'multiple_choice' ? 'Multiple choice' : q.type === 'identification' ? 'Identification' : q.type === 'true_false' ? 'True or false' : 'Essay response'}
                        </span>
                        <h4 className="font-bold text-[14px] tracking-tight text-foreground leading-relaxed">
                          {q.text}
                        </h4>
                      </div>
                      <span className="px-2.5 py-1 text-[11px] font-semibold font-sans rounded-full bg-muted text-muted-foreground border border-border shrink-0">
                        {q.points} pts
                      </span>
                    </div>

                    {/* Question Input based on Type */}
                    {/* A. Multiple Choice */}
                    {q.type === 'multiple_choice' && q.options && (
                      <div className="space-y-2 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          const isSelected = userAnswers[q.id] === letter || userAnswers[q.id] === opt;

                          return (
                            <label
                              key={optIdx}
                              className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/10 text-foreground font-semibold shadow-xs ring-1 ring-primary/20'
                                  : 'border-border bg-background hover:bg-muted text-foreground'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`exam_q_${q.id}`}
                                value={letter}
                                checked={isSelected}
                                onChange={() => handleSelectAnswer(q.id, letter)}
                                className="text-primary focus:ring-primary accent-primary"
                              />
                              <span className="w-5 h-5 rounded-md bg-muted text-muted-foreground text-[11px] font-bold flex items-center justify-center shrink-0">
                                {letter}
                              </span>
                              <span className="leading-normal">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* B. Identification */}
                    {q.type === 'identification' && (
                      <div className="space-y-2 pt-1">
                        <input
                          type="text"
                          required
                          value={userAnswers[q.id] || ''}
                          onChange={e => handleSelectAnswer(q.id, e.target.value)}
                          placeholder="Type your exact answer here..."
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-inner"
                        />
                        {q.description && (
                          <p className="text-[11px] text-muted-foreground pl-1">
                            {q.description}
                          </p>
                        )}
                      </div>
                    )}

                    {/* C. True or False */}
                    {q.type === 'true_false' && (
                      <div className="grid grid-cols-2 gap-3 pt-1 max-w-md">
                        {['True', 'False'].map(val => {
                          const isSelected = userAnswers[q.id] === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleSelectAnswer(q.id, val)}
                              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/30'
                                  : 'bg-background border-border hover:bg-muted text-muted-foreground'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`tf_run_${q.id}`}
                                checked={isSelected}
                                onChange={() => handleSelectAnswer(q.id, val)}
                                className="w-4 h-4 accent-emerald-600"
                              />
                              <span>{val}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* D. Essay */}
                    {q.type === 'essay' && (
                      <div className="space-y-2 pt-1">
                        <textarea
                          rows={4}
                          required
                          value={userAnswers[q.id] || ''}
                          onChange={e => handleSelectAnswer(q.id, e.target.value)}
                          placeholder="Type your essay response in detail..."
                          className="w-full p-3.5 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-inner resize-y leading-relaxed"
                        />
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                          <span>{q.rubricNotes ? `Rubric: ${q.rubricNotes}` : 'Open-ended answer evaluation'}</span>
                          <span>{(userAnswers[q.id] || '').split(/\s+/).filter(Boolean).length} words</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls & Submission Button */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              {currentPageIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
                  className="px-4 py-2 text-xs font-bold bg-muted hover:bg-muted/80 text-foreground rounded-xl border border-border transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Page</span>
                </button>
              ) : (
                <div />
              )}

              {currentPageIndex < totalPages - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentPageIndex(prev => Math.min(totalPages - 1, prev + 1))}
                  className="px-5 py-2.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-primary-sm flex items-center space-x-1.5 cursor-pointer active:scale-98"
                >
                  <span>Next Page</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-primary-sm flex items-center space-x-2 cursor-pointer active:scale-98"
                >
                  <Check className="w-4 h-4" />
                  <span>Submit Assessment Answers</span>
                </button>
              )}
            </div>
          </form>
        ) : (
          /* Post-submission Review Screen */
          <div className="space-y-5">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <div>
                <span className="font-bold">Assessment Completed & Evaluation Synced</span>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                  Your submitted responses have been recorded and evaluated against the course grading matrix.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {activeExam.questions
                .filter(q => q.type !== 'description' && q.type !== 'page_break')
                .map((q, idx) => {
                  let isCorrect = false;
                  const userAns = (userAnswers[q.id] || '').trim();

                  if (q.type === 'multiple_choice' || q.type === 'true_false') {
                    isCorrect = userAns === (q.correctAnswer || '').trim();
                  } else if (q.type === 'identification') {
                    isCorrect = userAns.toLowerCase() === (q.correctAnswer || '').trim().toLowerCase();
                  } else if (q.type === 'essay') {
                    isCorrect = userAns.length > 10;
                  }

                  return (
                    <div
                      key={q.id}
                      className="p-5 rounded-2xl border border-border bg-card space-y-3 text-xs"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[11.5px] font-semibold text-muted-foreground">
                            Question {idx + 1} · {q.type}
                          </span>
                          <h4 className="font-bold text-[14px] tracking-tight text-foreground">{q.text}</h4>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${
                            isCorrect
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {isCorrect ? `+${q.points} pts` : '0 pts'}
                        </span>
                      </div>

                      <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 border border-border/80">
                        <div className="text-[11px] text-muted-foreground flex items-center space-x-1.5">
                          <span>Your Submitted Answer:</span>
                          <span className="font-bold text-foreground">
                            {userAnswers[q.id] || '(No response provided)'}
                          </span>
                        </div>

                        {q.type !== 'essay' && q.correctAnswer && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5 font-sans">
                            <span>Expected Answer Key:</span>
                            <span className="font-bold">{q.correctAnswer}</span>
                          </div>
                        )}

                        {q.type === 'essay' && q.rubricNotes && (
                          <div className="text-[11px] text-purple-600 dark:text-purple-400 flex items-center space-x-1.5 font-sans">
                            <span>Grading Notes:</span>
                            <span>{q.rubricNotes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveExam(null);
                  if (onBackToModules) {
                    onBackToModules();
                  } else if (onSelectExam) {
                    onSelectExam(null);
                  }
                }}
                className="px-5 py-2.5 text-xs font-bold bg-muted hover:bg-muted/80 text-foreground rounded-xl border border-border transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{onBackToModules ? 'Done / Return to Modules' : 'Done / Return to Exams'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Exams List View
  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {onBackToModules && (
        <button
          type="button"
          onClick={onBackToModules}
          className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1.5 cursor-pointer -mb-2 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Modules</span>
        </button>
      )}

      <PageHeader
        title="Exams & Assessments"
        description="Standardized evaluation modules, Google Forms-style exams, and timed knowledge checks."
        actions={
          activeRole === 'faculty' && (
            <button
              onClick={() => setIsCreatingExam(true)}
              className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground rounded-xl transition-all shadow-primary-sm flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Exam</span>
            </button>
          )
        }
      />

      <div className="space-y-3">
        {((isLoading || isSyncing) && courseExams.length === 0) ? (
          <div data-testid="exams-loading" className="space-y-3" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`exams-skeleton-${i}`} className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3.5 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-1/2 rounded bg-muted" />
                  <div className="h-3 w-1/3 rounded bg-muted/70" />
                </div>
              </div>
            ))}
          </div>
        ) : courseExams.length === 0 ? (
          <EmptyState
            title="No exams published for this course yet."
            actionLabel={activeRole === 'faculty' ? 'Create your first exam now' : undefined}
            onAction={activeRole === 'faculty' ? () => setIsCreatingExam(true) : undefined}
          />
        ) : (
          <>
            <div className="flex items-center justify-end gap-2">
              <TermFilterSelect
                id="exams-term-filter"
                value={termFilter}
                onChange={setTermFilter}
                prefixLabel="Filter by term:"
                terms={effectiveTerms}
              />
            </div>
            {visibleExams.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground text-center py-6">
                No exams tagged for this term yet.
              </p>
            ) : (
          visibleExams.map(exam => {
            const existingSub = db.submissions.find(
              s => s.activityKey === `asg-exam-${exam.id}` && s.studentId === activeUser.id
            );

            const questionCount = exam.questions.filter(
              q => q.type !== 'description' && q.type !== 'page_break'
            ).length;
            const pageCount = exam.questions.filter(q => q.type === 'page_break').length + 1;
            const totalPts = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);
            // Legacy 'final' rows normalize to 'finals' on read.
            const termId: TermId = normalizeTermId(exam.term) ?? 'midterm';
            const termChipCls =
              termId === 'prelim'
                ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20'
                : termId === 'midterm'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';

            return (
              <div
                key={exam.id}
                className="p-4 bg-card border border-border rounded-2xl hover:border-muted-foreground/25 hover:shadow-card transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-muted border border-border text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h3 className="font-bold text-[14px] tracking-tight truncate text-foreground group-hover:text-primary transition-colors">
                        {exam.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border flex items-center space-x-1 ${termChipCls}`}>
                        <span>{TERM_LABELS[termId]} exam</span>
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">
                      {exam.instructions}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground font-sans mt-2">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{exam.timeLimitMinutes} mins</span>
                      </span>
                      <span>·</span>
                      <span>{questionCount} question{questionCount !== 1 ? 's' : ''}</span>
                      {pageCount > 1 && (
                        <>
                          <span>·</span>
                          <span className="text-[12px] font-medium text-muted-foreground">
                            {pageCount} pages
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span className="font-semibold text-foreground">
                        {totalPts} total points
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-auto">
                  {existingSub && existingSub.grade !== undefined && (
                    <span className="px-3 py-1 text-xs font-sans font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                      Scored {existingSub.grade}%
                    </span>
                  )}

                  <button
                      onClick={() => handleStartExam(exam)}
                      className="px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-primary-sm flex items-center space-x-1.5 cursor-pointer active:scale-98 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{activeRole === 'admin' ? 'Preview Exam' : existingSub ? 'Retake Exam' : 'Take Exam'}</span>
                    </button>
                </div>
              </div>
            );
          }))}
          </>
        )}
      </div>
    </div>
  );
};

export default ExamsView;
