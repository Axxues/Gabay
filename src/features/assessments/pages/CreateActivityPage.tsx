import React, { useState } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import type { TermId } from '@/services/lms/types/lms.types';
import {
  ArrowLeft,
  FileCheck2,
  Check,
  FileText,
  Loader2
} from 'lucide-react';
import {
  ActivityFormFields,
  buildActivityPayload,
  emptyActivityFormValue,
  validateActivityForm,
  type ActivityFormValue
} from '@/features/assessments/components/forms/ActivityFormFields';
import {
  QuestionSetFields,
  emptyQuestionSetValue,
  questionSetTotals,
  validateQuestionSet,
  buildActivityPayload as buildQuestionSetPayload,
  type QuestionSetValue
} from '@/features/assessments/components/forms/QuestionSetFields';

interface CreateActivityPageProps {
  courseId: string;
  onBack: () => void;
  onActivityCreated: (newActivityId: string) => void;
}

export const CreateActivityPage: React.FC<CreateActivityPageProps> = ({
  courseId,
  onBack,
  onActivityCreated
}) => {
  const { db, createActivity, showAlert, effectiveTermsForCourse } = useLMS();
  const course = db.courses.find(c => c.id === courseId);

  const [activityType, setActivityType] = useState<'classic' | 'question_set'>('classic');

  const [form, setForm] = useState<ActivityFormValue>(() => emptyActivityFormValue());

  // Syllabus-driven grading terms for this course; new question sets default
  // to the first effective term (midterm for legacy 2-term courses).
  const activityTerms: TermId[] =
    typeof effectiveTermsForCourse === 'function'
      ? effectiveTermsForCourse(courseId)
      : ['midterm', 'finals'];

  const [builder, setBuilder] = useState<QuestionSetValue>(() => ({
    ...emptyQuestionSetValue(),
    term: activityTerms[0] ?? 'midterm'
  }));

  // Which save is in flight (null when idle). One shared flag so the
  // clicked button can spin while every save button disables — and
  // double-clicks can't double-submit.
  const [savingAction, setSavingAction] = useState<'publish' | 'draft' | null>(null);

  const handleSaveClassic = async (publish: boolean) => {
    if (savingAction) return;
    const validationError = validateActivityForm(form);
    if (validationError) {
      showAlert({
        title: validationError.title,
        message: validationError.message,
        type: 'warning'
      });
      return;
    }

    setSavingAction(publish ? 'publish' : 'draft');
    try {
      const created = await createActivity(buildActivityPayload(courseId, form, publish));

      showAlert({
        title: publish ? 'Activity Published' : 'Activity Draft Saved',
        message: `"${form.title.trim()}" has been created successfully for ${course?.code || 'this course'}.`,
        type: 'success'
      });

      onActivityCreated(created.id);
    } finally {
      setSavingAction(null);
    }
  };

  const handleSaveQuestionSet = async () => {
    if (savingAction) return;
    const error = validateQuestionSet(builder);
    if (error) {
      showAlert({
        title: error.title,
        message: error.message,
        type: 'warning'
      });
      return;
    }

    const { totalPoints, gradableCount } = questionSetTotals(builder);

    setSavingAction('publish');
    try {
      const created = await createActivity(buildQuestionSetPayload(courseId, builder));

      showAlert({
        title: 'Activity Published',
        message: `"${builder.title.trim()}" created with ${gradableCount} question(s), totaling ${totalPoints} pts.`,
        type: 'success'
      });

      onActivityCreated(created.id);
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pt-4 sm:pt-6 pb-20 px-1 font-sans">
      {/* Top Breadcrumb & Navigation */}
      <div className="pb-6 border-b border-border/70">
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground font-sans">
            <button
              type="button"
              onClick={onBack}
              className="hover:text-primary transition-colors cursor-pointer flex items-center space-x-1.5 font-medium group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Activities</span>
            </button>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-semibold truncate max-w-[240px]">
              {course?.code || 'Course'}
            </span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-muted-foreground font-semibold px-2.5 py-0.5 rounded-full bg-muted border border-border text-[11px]">
              New activity
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div className="space-y-1">
              <h1 className="text-[22px] font-extrabold tracking-tight text-foreground flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <span>Create new activity</span>
              </h1>
              <p className="text-[13px] text-muted-foreground pl-0.5">
                Design assessment milestones, configure grading criteria, and attach course handouts.
              </p>
            </div>

            {/* Quick action buttons on top (classic mode only — question sets have their own actions) */}
            {activityType === 'classic' && (
            <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveClassic(false)}
                disabled={savingAction !== null}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center space-x-1.5"
              >
                {savingAction === 'draft' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{savingAction === 'draft' ? 'Saving…' : 'Save draft'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveClassic(true)}
                disabled={savingAction !== null}
                className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-primary-sm cursor-pointer active:scale-98 flex items-center space-x-1.5 disabled:opacity-60 disabled:cursor-wait"
              >
                {savingAction === 'publish'
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Check className="w-3.5 h-3.5" />}
                <span>{savingAction === 'publish' ? 'Publishing…' : 'Publish activity'}</span>
              </button>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity type chooser: Classic vs Question Set (unified creation) */}
      <div className="p-1 w-full bg-muted/60 border border-border rounded-2xl grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => setActivityType('classic')}
          className={`p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
            activityType === 'classic'
              ? 'bg-primary/[0.04] text-foreground border border-primary/30 ring-1 ring-primary/15'
              : 'text-muted-foreground border border-border/70 hover:bg-muted/40'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-muted-foreground" />
          <span>Classic activity</span>
        </button>
        <button
          type="button"
          onClick={() => setActivityType('question_set')}
          className={`p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
            activityType === 'question_set'
              ? 'bg-primary/[0.04] text-foreground border border-primary/30 ring-1 ring-primary/15'
              : 'text-muted-foreground border border-border/70 hover:bg-muted/40'
          }`}
        >
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span>New question set</span>
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground font-medium -mt-4">
        {activityType === 'classic'
          ? 'File upload / text entry activity with rubric and deadlines.'
          : 'Quiz-style question set (Multiple Choice, Identification, True/False, Essay) auto-scored on submit.'}
      </p>

      {activityType === 'question_set' ? (
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSaveQuestionSet();
        }}
        className="space-y-6 text-xs"
      >
        <QuestionSetFields value={builder} onChange={setBuilder} courseId={courseId} />

        {/* Bottom Submission Bar */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/70">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer w-full sm:w-auto"
          >
            Discard & return to activities
          </button>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={savingAction !== null}
              className="flex-1 sm:flex-initial px-6 py-2.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-primary-sm cursor-pointer active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-wait"
            >
              {savingAction === 'publish'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Check className="w-4 h-4" />}
              <span>{savingAction === 'publish' ? 'Publishing…' : 'Create & publish activity'}</span>
            </button>
          </div>
        </div>
      </form>
      ) : (
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSaveClassic(true);
        }}
        className="space-y-6 text-xs"
      >
        <ActivityFormFields courseId={courseId} value={form} onChange={setForm} />

        {/* Bottom Submission Bar */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/70">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer w-full sm:w-auto"
          >
            Discard & return to activities
          </button>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSaveClassic(false)}
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
              <span>{savingAction === 'publish' ? 'Publishing…' : 'Create & publish activity'}</span>
            </button>
          </div>
        </div>
      </form>
      )}
    </div>
  );
};

export default CreateActivityPage;
