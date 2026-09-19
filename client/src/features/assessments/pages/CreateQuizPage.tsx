import React, { useState } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import type { TermId } from '@/services/lms/types/lms.types';
import {
  QuizBuilderFields,
  emptyQuizBuilderValue,
  validateQuizBuilder,
  buildQuizPayload,
  quizTotals,
  type QuizBuilderValue
} from '@/features/assessments/components/forms/QuizBuilderFields';
import {
  ArrowLeft,
  HelpCircle,
  Check,
  Upload,
  Loader2
} from 'lucide-react';

interface CreateQuizPageProps {
  courseId: string;
  onBack: () => void;
  onQuizCreated: (newQuizId: string) => void;
}

export const CreateQuizPage: React.FC<CreateQuizPageProps> = ({
  courseId,
  onBack,
  onQuizCreated
}) => {
  const { db, createQuiz, showAlert, effectiveTermsForCourse } = useLMS();
  const course = db.courses.find(c => c.id === courseId);

  // Syllabus-driven grading terms for this course; new quizzes default to
  // the first effective term (midterm for legacy 2-term courses).
  const quizTerms: TermId[] =
    typeof effectiveTermsForCourse === 'function'
      ? effectiveTermsForCourse(courseId)
      : ['midterm', 'finals'];

  const [builder, setBuilder] = useState<QuizBuilderValue>(() => ({
    ...emptyQuizBuilderValue(),
    term: quizTerms[0] ?? 'midterm'
  }));

  // Which save is in flight (null when idle). One shared flag so the
  // clicked button can spin while every save button disables — and
  // double-clicks can't double-submit.
  const [savingAction, setSavingAction] = useState<'publish' | 'draft' | null>(null);

  const handleSaveQuiz = async (published: boolean) => {
    if (savingAction) return;
    const error = validateQuizBuilder(builder);
    if (error) {
      showAlert({
        title: error.title,
        message: error.message,
        type: 'warning'
      });
      return;
    }

    setSavingAction(published ? 'publish' : 'draft');
    try {
      const created = await createQuiz(buildQuizPayload(courseId, builder, published));
      const { totalPoints, totalQuestions, totalPages } = quizTotals(builder);

      showAlert({
        title: builder.delayPosting ? 'Quiz Scheduled' : published ? 'Quiz Published' : 'Quiz Draft Saved',
        message: builder.delayPosting
          ? `"${builder.title.trim()}" has been scheduled for release on ${new Date(builder.delayedDate).toLocaleString()}.`
          : `"${builder.title.trim()}" created with ${totalQuestions} question(s) across ${totalPages} page(s), totaling ${totalPoints} pts.`,
        type: 'success'
      });

      onQuizCreated(created.id);
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pt-4 sm:pt-6 pb-28 px-2 sm:px-4 font-sans select-none">
      {/* Top Header & Breadcrumb */}
      <div className="pb-4 border-b border-border/70">
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground font-sans">
            <button
              type="button"
              onClick={onBack}
              className="hover:text-primary transition-colors cursor-pointer flex items-center space-x-1.5 font-medium group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Quizzes</span>
            </button>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-semibold truncate max-w-[240px]">
              {course?.code || 'Course'}
            </span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-muted-foreground font-semibold px-2.5 py-0.5 rounded-full bg-muted border border-border text-[11px]">
              Quiz builder
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div className="space-y-1">
              <h1 className="text-[22px] font-extrabold tracking-tight text-foreground flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span>Create assessment quiz</span>
              </h1>
              <p className="text-[13px] text-muted-foreground pl-0.5">
                Author multiple choice, identification, true/false, and essay items with options and floating actions.
              </p>
            </div>

            {/* Quick Action Top Bar */}
            <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('quiz-builder:toggle-upload'))}
                className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-primary-sm cursor-pointer active:scale-98 flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload file</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveQuiz(false)}
                disabled={savingAction !== null}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-wait flex items-center space-x-1.5"
              >
                {savingAction === 'draft' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{savingAction === 'draft' ? 'Saving…' : 'Save draft'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveQuiz(true)}
                disabled={savingAction !== null}
                className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-primary-sm cursor-pointer active:scale-98 flex items-center space-x-1.5 disabled:opacity-60 disabled:cursor-wait"
              >
                {savingAction === 'publish'
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Check className="w-3.5 h-3.5" />}
                <span>{savingAction === 'publish' ? 'Publishing…' : 'Publish quiz'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout Container (Cards Column + Google Forms Floating Side Actions) */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSaveQuiz(true);
        }}
      >
        <QuizBuilderFields value={builder} onChange={setBuilder} courseId={courseId} />

        {/* Bottom Form Actions Bar */}
        <div className="pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/70">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer w-full sm:w-auto"
          >
            Discard & return to quizzes
          </button>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSaveQuiz(false)}
              disabled={savingAction !== null}
              className="flex-1 sm:flex-initial px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center space-x-2"
            >
              {savingAction === 'draft' && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{savingAction === 'draft' ? 'Saving…' : 'Save as unpublished draft'}</span>
            </button>
            <button
              type="submit"
              disabled={savingAction !== null}
              className="flex-1 sm:flex-initial px-6 py-2.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-primary-sm cursor-pointer active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-wait"
            >
              {savingAction === 'publish'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Check className="w-4 h-4" />}
              <span>{savingAction === 'publish' ? 'Publishing…' : 'Publish quiz form'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateQuizPage;
