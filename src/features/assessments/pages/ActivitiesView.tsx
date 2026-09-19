import React, { useEffect, useMemo, useState } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import type { TermId } from '@/services/lms/types/lms.types';
import { normalizeTermId } from '@/utils/gradingTerms';
import { TERM_LABELS, TermFilterSelect } from '@/components/shared/TermSelect';
import { SourceFilterSelect } from '@/features/assessments/components/filters/SourceFilterSelect';
import {
  buildAssessmentSourceIndex,
  matchesSourceFilter,
  type AssessmentSourceFilter,
} from '@/utils/assessmentSource';
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  Upload,
  Award,
  Send,
  ChevronRight,
  Plus,
  Trash2,
  ArrowLeft,
  Calendar,
  Users
} from 'lucide-react';
import { CreateActivityPage } from './CreateActivityPage';
import { ActivityRunnerView } from './ActivityRunnerView';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';

interface ActivitiesViewProps {
  courseId: string;
  selectedActivityId: string | null;
  onSelectActivity: (actId: string | null) => void;
  onBackToModules?: () => void;
}

const questionSetKeyOf = (activityId: string) => `asg-activity-${activityId}`;

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  courseId,
  selectedActivityId,
  onSelectActivity,
  onBackToModules
}) => {
  const {
    activeRole,
    activeUser,
    db,
    isLoading,
    isSyncing,
    submitActivity,
    deleteActivity,
    openSpeedGrader,
    showAlert,
    showConfirm,
    effectiveTermsForCourse
  } = useLMS() as ReturnType<typeof useLMS> & {
    effectiveTermsForCourse?: (courseId: string) => TermId[];
    // Sibling-WIP refresh flag: read when the provider supplies it.
    isSyncing?: boolean;
  };

  const courseActivities = (db.activities || []).filter(a => a.courseId === courseId);
  const courseClassics = courseActivities.filter(a => a.format === 'classic');
  const courseQuestionSets = courseActivities.filter(a => a.format !== 'classic');

  // Syllabus-driven terms (Prelim/Midterm/Finals depending on scanned syllabus).
  const effectiveTerms: TermId[] =
    courseId && typeof effectiveTermsForCourse === 'function'
      ? effectiveTermsForCourse(courseId)
      : ['prelim', 'midterm', 'finals'];

  // Grading-term filter for the list (legacy rows without a term read as 'midterm').
  const [termFilter, setTermFilter] = useState<'all' | TermId>('all');
  useEffect(() => {
    if (termFilter !== 'all' && !effectiveTerms.includes(termFilter)) setTermFilter('all');
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Source filter: From Module (linked via module items) vs Direct (created on this page).
  const [sourceFilter, setSourceFilter] = useState<AssessmentSourceFilter>('all');
  const sourceIndex = useMemo(
    () => buildAssessmentSourceIndex((db as any).modules, courseId),
    [(db as any).modules, courseId]
  );
  const matchesTerm = (term?: TermId) =>
    termFilter === 'all' || (normalizeTermId(term) ?? 'midterm') === termFilter;
  const visibleClassics = courseClassics.filter(
    a =>
      matchesTerm(a.term) &&
      matchesSourceFilter(sourceIndex.classicActivityIds.has(a.id), sourceFilter)
  );
  const visibleQuestionSets = courseQuestionSets.filter(
    a =>
      matchesTerm(a.term) &&
      matchesSourceFilter(sourceIndex.activityIds.has(a.id), sourceFilter)
  );
  const selectedActivity = (db.activities || []).find(a => a.id === selectedActivityId);

  // Synthetic link convention (`asg-activity-<id>`, shared with submissions /
  // badges / module items): selecting one opens the question-set runner
  // directly instead of dead-ending on the list.
  const syntheticActivityId =
    selectedActivityId && selectedActivityId.startsWith('asg-activity-')
      ? selectedActivityId.slice('asg-activity-'.length)
      : null;

  // Student submission form state
  const [submissionType, setSubmissionType] = useState<'file' | 'online_text'>('online_text');
  const [textContent, setTextContent] = useState('');
  const [simulatedFileName, setSimulatedFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Full Page Create Activity State
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);

  const currentSubmission = selectedActivity
    ? db.submissions.find(s => s.activityKey === selectedActivity.id && s.studentId === activeUser.id)
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity) return;

    if (submissionType === 'online_text' && !textContent.trim()) {
      showAlert("Please enter submission text content.");
      return;
    }
    if (submissionType === 'file' && !simulatedFileName) {
      showAlert("Please choose a file or use the simulated file dropzone.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitActivity(
        selectedActivity.id,
        submissionType,
        textContent,
        simulatedFileName || 'CMSC131_Lab_Submission.pdf'
      );
      showAlert({
        title: "Activity Submitted",
        message: "Your submission has been recorded successfully.",
        type: "success"
      });
    } catch {
      // submitActivity already surfaced the alert.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (actId: string) => {
    showConfirm(
      "Are you sure you want to delete this activity and all associated student submissions?",
      () => {
        deleteActivity(actId)
          .then(() => onSelectActivity(null))
          .catch(() => {});
      },
      "Delete Activity"
    );
  };

  const handleDeleteQuestionSet = (id: string) => {
    showConfirm(
      'Are you sure you want to delete this question set and all associated student submissions?',
      () => {
        deleteActivity(id)
          .then(() => onSelectActivity(null))
          .catch(() => {});
      },
      'Delete Question Set'
    );
  };

  // If user clicked create activity, render unified creation page (classic + question set)
  if (isCreatingActivity) {
    return (
      <CreateActivityPage
        courseId={courseId}
        onBack={() => setIsCreatingActivity(false)}
        onActivityCreated={actId => {
          setIsCreatingActivity(false);
          onSelectActivity(actId);
        }}
      />
    );
  }

  // A selected question-set activity (raw id) renders its runner. A synthetic
  // `asg-activity-*` link (e.g. from a module item) resolves to the same
  // runner; exiting it clears the selection so the list shows on return.
  const runnerActivityId =
    selectedActivity && selectedActivity.format !== 'classic'
      ? selectedActivity.id
      : syntheticActivityId;
  if (runnerActivityId) {
    return (
      <ActivityRunnerView
        courseId={courseId}
        activityId={runnerActivityId}
        onSelectActivity={onSelectActivity}
        onBackToModules={onBackToModules}
      />
    );
  }

  // If no activity selected, render unified activities list
  if (!selectedActivity) {
    return (
      <div className="space-y-6 animate-fade-in">
        {onBackToModules && (
          <button
            type="button"
            onClick={onBackToModules}
            className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1.5 cursor-pointer -mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Modules</span>
          </button>
        )}
        <PageHeader
          title="Activities"
          description="Course activities and laboratory tasks."
          actions={
            activeRole === 'faculty' && (
              <button
                onClick={() => setIsCreatingActivity(true)}
                className="px-3.5 py-2 text-xs font-bold bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground rounded-xl transition-all shadow-subtle flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Activity</span>
              </button>
            )
          }
        />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <SourceFilterSelect
            id="activities-source-filter"
            value={sourceFilter}
            onChange={setSourceFilter}
            prefixLabel="Filter by source:"
          />
          <TermFilterSelect
            id="activities-term-filter"
            value={termFilter}
            onChange={setTermFilter}
            prefixLabel="Filter by term:"
            terms={effectiveTerms}
          />
        </div>

        <div className="space-y-3">
          {(isLoading || isSyncing) && courseActivities.length === 0 ? (
            <div data-testid="activities-loading" className="space-y-3" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`activities-skeleton-${i}`} className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3.5 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-1/2 rounded bg-muted" />
                    <div className="h-3 w-1/3 rounded bg-muted/70" />
                  </div>
                </div>
              ))}
            </div>
          ) : courseActivities.length === 0 ? (
            <EmptyState
              title="No activities published for this course yet."
            />
          ) : visibleClassics.length === 0 && visibleQuestionSets.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground text-center py-6">
              No activities match the selected filters yet.
            </p>
          ) : (
            <>
            {visibleClassics.map(act => {
              const studentSub = db.submissions.find(
                s => s.activityKey === act.id && s.studentId === activeUser.id
              );
              const actTermId: TermId = normalizeTermId(act.term) ?? 'midterm';
              const actFromModule = sourceIndex.classicActivityIds.has(act.id);
              const actModuleTitle = sourceIndex.moduleTitleByClassicActivity.get(act.id);

              return (
                <div
                  key={act.id}
                  onClick={() => onSelectActivity(act.id)}
                  className="group p-4 bg-card border border-border rounded-2xl hover:border-muted-foreground/25 hover:shadow-card cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-muted border border-border text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <h3 className="font-bold text-[14px] tracking-tight truncate text-foreground group-hover:text-primary transition-colors">
                          {act.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border shrink-0">
                          {TERM_LABELS[actTermId]}
                        </span>
                        <span
                          title={actFromModule && actModuleTitle ? `From module: ${actModuleTitle}` : 'Created directly on the Activities page'}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                            actFromModule
                              ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20'
                              : 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20'
                          }`}
                        >
                          {actFromModule ? 'Module' : 'Direct'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground mt-1 font-sans">
                        <span className="font-medium">
                          {act.category || 'Activity'}
                        </span>
                        <span>·</span>
                        <span>Due {act.dueDate ? new Date(act.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No due date'}</span>
                        <span>·</span>
                        <span className="font-semibold text-foreground">{act.pointsPossible} pts</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {studentSub ? (
                      studentSub.status === 'graded' ? (
                        <span className="px-2.5 py-1 text-xs font-sans font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-500/20 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Scored {studentSub.grade}/{act.pointsPossible}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-sans font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-full border border-blue-500/20 flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Submitted</span>
                        </span>
                      )
                    ) : (
                      activeRole === 'student' && (
                      <span className="px-2.5 py-1 text-xs font-sans font-medium bg-muted text-muted-foreground rounded-full border border-border">
                        Not submitted
                      </span>
                      )
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              );
            })}
            {visibleQuestionSets.map(act => {
              const studentSub =
                activeRole === 'student'
                  ? db.submissions.find(
                      s => s.activityKey === questionSetKeyOf(act.id) && s.studentId === activeUser.id
                    )
                  : undefined;
              const hasEssay = act.questions.some(q => q.type === 'essay');
              const actTermId: TermId = normalizeTermId(act.term) ?? 'midterm';
              const actFromModule = sourceIndex.activityIds.has(act.id);
              const actModuleTitle = sourceIndex.moduleTitleByActivity.get(act.id);

              return (
                <div
                  key={act.id}
                  onClick={() => onSelectActivity(act.id)}
                  className="group p-4 bg-card border border-border rounded-2xl hover:border-muted-foreground/25 hover:shadow-card cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-muted border border-border text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <h3 className="font-bold text-[14px] tracking-tight truncate text-foreground group-hover:text-primary transition-colors">
                          {(act.title || '').trim() || 'Untitled question set'}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border shrink-0">
                          {TERM_LABELS[actTermId]}
                        </span>
                        <span
                          title={actFromModule && actModuleTitle ? `From module: ${actModuleTitle}` : 'Created directly on the Activities page'}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                            actFromModule
                              ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20'
                              : 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20'
                          }`}
                        >
                          {actFromModule ? 'Module' : 'Direct'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground mt-1 font-sans">
                        <span className="font-medium">
                          Question set
                        </span>
                        <span>·</span>
                        <span>{act.questions.length} questions</span>
                        <span>·</span>
                        <span className="font-semibold text-foreground">{act.pointsPossible} pts</span>
                        {act.dueDate && (
                          <>
                            <span>·</span>
                            <span>
                              Due{' '}
                              {new Date(act.dueDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {studentSub ? (
                      studentSub.status === 'graded' ? (
                        <span className="px-2.5 py-1 text-xs font-sans font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-500/20 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Scored {studentSub.grade}%</span>
                        </span>
                      ) : hasEssay ? (
                        <span className="px-2.5 py-1 text-xs font-sans font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full border border-amber-500/20 flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending review</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-sans font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-full border border-blue-500/20 flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Submitted</span>
                        </span>
                      )
                    ) : (
                      activeRole === 'student' && (
                        <span className="px-2.5 py-1 text-xs font-sans font-medium bg-muted text-muted-foreground rounded-full border border-border">
                          Not submitted
                        </span>
                      )
                    )}
                    {activeRole === 'faculty' && (
                      <button
                        type="button"
                        title="Delete Question Set"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteQuestionSet(act.id);
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-500/10 rounded-xl border border-red-500/20 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              );
            })}
            </>
          )}
        </div>

      </div>
    );
  }

  // Render Detailed Activity & Submission Workspace (classic format)
  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-fade-in pb-16">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (onBackToModules) {
              onBackToModules();
            } else {
              onSelectActivity(null);
            }
          }}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{onBackToModules ? 'Back to modules' : 'Back to activities'}</span>
        </button>

        {activeRole === 'faculty' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Classic rows link via the raw activity id; question-set rows
                // link via the synthetic `asg-activity-<id>` key.
                const sub = db.submissions.find(
                  s =>
                    s.activityKey === selectedActivity.id ||
                    s.activityKey === questionSetKeyOf(selectedActivity.id) ||
                    (s as unknown as { activityId?: string }).activityId === selectedActivity.id
                );
                if (sub) openSpeedGrader(sub.id);
                else showAlert("No student submissions yet for this activity.");
              }}
              className="px-3 py-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
            >
              Inspect in SpeedGrader
            </button>
            <button
              onClick={() => handleDelete(selectedActivity.id)}
              className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              title="Delete activity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Activity Header Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="min-w-0 max-w-2xl space-y-1.5">
            <div className="text-[12px] font-semibold text-muted-foreground">
              {selectedActivity.category || 'Activity'}
            </div>
            <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.02em] text-foreground break-words">
              {selectedActivity.title}
            </h1>
          </div>

          <div className="shrink-0 sm:text-right">
            <div className="text-[28px] leading-none font-extrabold tabular-nums tracking-tight text-foreground">
              {selectedActivity.pointsPossible}
            </div>
            <div className="mt-1 text-[12px] text-muted-foreground">points</div>
          </div>
        </div>

        {/* Due Date & Submission Type */}
        <div className="grid sm:grid-cols-3 gap-3 py-4 border-y border-border/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-muted-foreground">Due</div>
              <div className="text-[12.5px] font-semibold text-foreground truncate">{selectedActivity.dueDate ? new Date(selectedActivity.dueDate).toLocaleString() : 'No due date'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 min-w-0">
            <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-muted-foreground">Submissions</div>
              <div className="text-[12.5px] font-semibold text-foreground truncate">File upload, text entry</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 min-w-0">
            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-muted-foreground">Available to</div>
              <div className="text-[12.5px] font-semibold text-foreground truncate">All enrolled students</div>
            </div>
          </div>
        </div>

        {/* Activity Instructions */}
        <div className="space-y-2 max-w-3xl">
          <h4 className="text-[13px] font-bold text-foreground">
            Guidelines
          </h4>
          <p className="text-[13.5px] leading-relaxed text-muted-foreground whitespace-pre-line">{selectedActivity.instructions}</p>
        </div>

        {/* Rubric Criteria Summary */}
        <div className="pt-2 space-y-3">
          <h4 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
            <Award className="w-4 h-4 text-muted-foreground" />
            <span>Rubric</span>
            <span className="text-[12px] font-semibold text-muted-foreground">· {(selectedActivity.rubric || []).length} criteria</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(selectedActivity.rubric || []).map(criterion => (
              <div key={criterion.id} className="p-4 bg-muted/20 rounded-xl border border-border/70 space-y-2.5">
                <div className="flex justify-between items-baseline gap-3">
                  <span className="font-bold text-[13px] tracking-tight text-foreground">{criterion.title}</span>
                  <span className="text-[12px] font-bold tabular-nums text-muted-foreground shrink-0">{criterion.points} pts</span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">{criterion.description}</p>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {criterion.ratings.map(r => (
                    <div key={r.points} className="px-2 py-2 bg-card border border-border/60 rounded-lg text-center">
                      <div className="text-[12px] font-bold tabular-nums text-foreground">{r.points}</div>
                      <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground truncate">{r.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>

      {/* Submission Status Section (For Students) */}
      {activeRole === 'student' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-subtle space-y-4">
          <h3 className="font-bold text-base text-foreground flex items-center justify-between">
            <span>Your Submission Status</span>
            {currentSubmission ? (
              currentSubmission.status === 'graded' ? (
                <span className="px-3 py-1 text-xs font-sans font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-500/20">
                  Evaluated: {currentSubmission.grade} / {selectedActivity.pointsPossible} pts
                </span>
              ) : (
                <span className="px-3 py-1 text-xs font-sans font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg border border-blue-500/20 flex items-center space-x-1">
                  Submitted • Pending Evaluation
                </span>
              )
            ) : (
              <span className="px-3 py-1 text-xs font-sans font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-500/20">
                Awaiting Submission
              </span>
            )}
          </h3>

          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="flex space-x-2 border-b border-border pb-2">
              <button
                type="button"
                onClick={() => setSubmissionType('online_text')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${submissionType === 'online_text'
                    ? 'bg-primary text-primary-foreground shadow-subtle'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
              >
                Text Entry / Repository URL
              </button>
              <button
                type="button"
                onClick={() => setSubmissionType('file')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${submissionType === 'file'
                    ? 'bg-primary text-primary-foreground shadow-subtle'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
              >
                File Upload (.PDF / .ZIP)
              </button>
            </div>

            {submissionType === 'online_text' ? (
              <div className="space-y-2">
                <label className="block font-bold text-foreground">
                  Online Text Content & Code Submissions:
                </label>
                <textarea
                  rows={5}
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  placeholder="Paste your source code, laboratory answers, or Git repository URL here..."
                  className="w-full p-3 rounded-xl border border-border bg-background font-sans text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary text-xs outline-none"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block font-bold text-foreground">
                  File Attachment Dropzone:
                </label>
                <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-2 bg-muted/20">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-foreground font-semibold">
                    Simulate file upload for GABAY evaluation
                  </p>
                  <input
                    type="text"
                    value={simulatedFileName}
                    onChange={e => setSimulatedFileName(e.target.value)}
                    placeholder="e.g. CMSC131_Lab4_JayveeReyes_2021-SLUC-0492.pdf"
                    className="max-w-md mx-auto p-2.5 border border-border rounded-xl font-sans text-center w-full bg-background text-xs outline-none"
                  />
                  <div className="text-[10px] text-muted-foreground font-sans">
                    Allowed types: PDF, DOCX, ZIP (Max 25MB)
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-bold bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground rounded-xl transition-all shadow-primary-sm flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{currentSubmission ? 'Resubmit Activity' : 'Submit Activity to GABAY'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ActivitiesView;
