import React, { useMemo, useState } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  ChevronDown,
  Download,
  Search,
  Lock,
  Globe,
  Calculator
} from 'lucide-react';
import {
  autoScoreFraction,
  bucketColumnsByTerm,
  buildAutoColumns,
  classStandingPercent,
  extractTermWeights,
  finalPercentTerms,
  resolveExamScore,
  resolveSPRWeights,
  round2,
  termGrade,
} from '@/utils/spr';
import type { SPRColumn } from '@/services/lms/types/lms.types';
import type { TermId } from '@/utils/gradingTerms';
import { normalizeTermId } from '@/utils/gradingTerms';
import { TERM_LABELS } from '@/components/shared/TermSelect';
import { exportSPRToExcel } from '@/utils/sprExport';

interface FacultyGradebookProps {
  courseId: string;
  onGoToSyllabus?: () => void;
}

// Institutional CHED / University Transmutation Table (1.00 - 5.00)
export const getTransmutedGrade = (
  percentage: number | null | undefined
): { grade: string; remark: 'Passed' | 'Failed' | 'Pending'; color: string } => {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return { grade: '—', remark: 'Pending', color: 'text-muted-foreground bg-muted border-border' };
  }
  if (percentage >= 98) return { grade: '1.00', remark: 'Passed', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  if (percentage >= 95) return { grade: '1.25', remark: 'Passed', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  if (percentage >= 92) return { grade: '1.50', remark: 'Passed', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  if (percentage >= 89) return { grade: '1.75', remark: 'Passed', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  if (percentage >= 86) return { grade: '2.00', remark: 'Passed', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  if (percentage >= 83) return { grade: '2.25', remark: 'Passed', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  if (percentage >= 80) return { grade: '2.50', remark: 'Passed', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  if (percentage >= 77) return { grade: '2.75', remark: 'Passed', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  if (percentage >= 75) return { grade: '3.00', remark: 'Passed', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  return { grade: '5.00', remark: 'Failed', color: 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' };
};

// Short period labels for the dense grade-table headers (classic Midterm/Final
// blocks keep their pre-change "MT"/"FT" wording).
const TERM_SHORT: Record<TermId, string> = { prelim: 'Prelim', midterm: 'MT', finals: 'FT' };

export const FacultyGradebook: React.FC<FacultyGradebookProps> = ({ courseId, onGoToSyllabus }) => {
  const { db, showAlert, effectiveTermsForCourse, isLoading = false, isSyncing = false, setGradesReleased, upsertManualExamGrade } = useLMS() as ReturnType<typeof useLMS> & { isLoading?: boolean; isSyncing?: boolean; setGradesReleased: (courseId: string, term: TermId, released: boolean) => void; upsertManualExamGrade?: (examId: string, studentId: string, grade: number) => Promise<void> };

  const course = db.courses.find(c => c.id === courseId);
  const releaseMap = course?.gradesReleased || {};
  const approvedIds = new Set(
    (db.enrollmentRequests || [])
      .filter(r => r.courseId === courseId && r.status === 'approved')
      .map(r => r.studentId)
  );
  const students = db.users.filter(
    u => u.role === 'student' && ((u.enrolledCourseIds || []).includes(courseId) || approvedIds.has(u.id))
  );

  const [postingPolicy, setPostingPolicy] = useState<'manual' | 'automatic'>('manual');
  const [searchQuery, setSearchQuery] = useState('');

  // Syllabus-driven grading terms (Task 7): one period block per effective term.
  // Guarded like Task 6 consumers so mocked contexts without the provider fn
  // still render the classic pair. Defined before the collapse state so a
  // first-time visit (no stored preference) can default to all-collapsed.
  const terms = useMemo((): TermId[] => (
    typeof effectiveTermsForCourse === 'function'
      ? effectiveTermsForCourse(courseId)
      : ['midterm', 'finals']
  ), [courseId, course, effectiveTermsForCourse]);

  // Collapsible term groups: a collapsed term renders only its grade column
  // (1 col instead of N items + exam + grade), persisted per course so faculty
  // keep their preferred density across reloads. First visit defaults to all
  // collapsed for maximum scannability; expanding is one click per term.
  const collapseKey = `gabay-gradebook-collapsed-${courseId}`;
  const [collapsedTerms, setCollapsedTerms] = useState<Set<TermId>>(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(collapseKey) : null;
      if (raw === null) return new Set(terms);
      const parsed: unknown = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed.filter((t): t is TermId => t === 'prelim' || t === 'midterm' || t === 'finals') : []);
    } catch {
      return new Set();
    }
  });
  const isCollapsed = (term: TermId): boolean => collapsedTerms.has(term);
  const toggleTerm = (term: TermId) => {
    setCollapsedTerms(prev => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(collapseKey, JSON.stringify([...next]));
      } catch { /* storage unavailable — collapse still works for the session */ }
      return next;
    });
  };

  const filteredStudents = students.filter(
    s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentId && s.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const weights = useMemo(
    () => resolveSPRWeights(course?.syllabus?.gradingSystem ?? null),
    [course]
  );
  const hasParseError = weights.parseError === true;

  // Final weights per term parsed from the syllabus formula text (Task 2).
  // For the classic pair this yields { midterm: 40, finals: 60 } (parsed or
  // defaulted), so finalPercentTerms below equals the pre-change finalPercent.
  const termWeightsResult = useMemo(
    () => extractTermWeights(course?.syllabus?.gradingSystem ?? null, terms),
    [course, terms]
  );
  const termWeights = termWeightsResult.weights;
  const weightsDefaulted = termWeightsResult.defaulted;

  const autoCols = useMemo(
    () => buildAutoColumns(courseId, { activities: db.activities, quizzes: db.quizzes }),
    [courseId, db.activities, db.quizzes]
  );
  // Bucket auto columns by source-item term: each activity/quiz
  // renders only in its own term block. Legacy items without a term count
  // toward midterm (flagged once in the UI below).
  const { columnsByTerm, legacyUnmappedCount } = useMemo(
    () => bucketColumnsByTerm(autoCols, { activities: db.activities, quizzes: db.quizzes }, terms),
    [autoCols, db.activities, db.quizzes, terms]
  );
  const examPerfectByTerm = useMemo((): Record<TermId, number | null> => {
    const findPerfect = (term: TermId): number | null => {
      const want = normalizeTermId(term);
      // Faculty view shows the full score even when the exam is still a
      // draft (unpublished) so the column header never falls back to /1.
      // Prefer published, fall back to any matching exam in the course.
      const list = (db.exams ?? []).filter(x => x.courseId === courseId && normalizeTermId(x.term) === want);
      if (list.length === 0) return null;
      const e = list.find(x => x.published) ?? list[0];
      const pts = (e?.questions ?? []).reduce((s, q) => s + (q.points ?? 0), 0);
      return pts;
    };
    return { prelim: null, midterm: findPerfect('midterm'), finals: findPerfect('finals') };
  }, [courseId, db.exams]);

  const examIdByTerm = useMemo((): Record<TermId, string | null> => {
    const findId = (term: TermId): string | null => {
      const want = normalizeTermId(term);
      const list = (db.exams ?? []).filter(x => x.courseId === courseId && normalizeTermId(x.term) === want);
      if (list.length === 0) return null;
      return (list.find(x => x.published) ?? list[0])?.id ?? null;
    };
    return { prelim: null, midterm: findId('midterm'), finals: findId('finals') };
  }, [courseId, db.exams]);

  const [manualDrafts, setManualDrafts] = useState<Record<string, string>>({});
  const [savingManual, setSavingManual] = useState<Record<string, boolean>>({});

  const handleSaveManualExam = async (term: TermId, studentId: string) => {
    const examId = examIdByTerm[term];
    if (!examId || !upsertManualExamGrade) return;
    const key = `${term}:${studentId}`;
    const raw = (manualDrafts[key] ?? '').trim();
    if (raw === '') return;
    const grade = Number(raw);
    const perfect = examPerfectByTerm[term];
    if (!Number.isFinite(grade) || grade < 0 || (perfect !== null && grade > perfect)) {
      showAlert({
        title: 'Invalid exam score',
        message: perfect !== null ? `Enter a number from 0 to ${perfect}.` : 'Enter a non-negative number.',
        type: 'warning',
      });
      return;
    }
    setSavingManual(prev => ({ ...prev, [key]: true }));
    try {
      await upsertManualExamGrade(examId, studentId, grade);
      setManualDrafts(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch { /* context already surfaced alert */ }
    finally {
      setSavingManual(prev => ({ ...prev, [key]: false }));
    }
  };

  const getSourceTitle = (column: SPRColumn): string | null => {
    const link = column.linkedSource;
    if (!link) return null;
    if (link.kind === 'activity') {
      return (db.activities ?? []).find(a => a.id === link.sourceId)?.title ?? null;
    }
    return db.quizzes.find(q => q.id === link.sourceId)?.title ?? null;
  };

  interface SPRRowCell {
    score: number | null;
    isManual: boolean;
    sourceTitle: string | null;
  }

  interface SPRTermResult {
    cells: SPRRowCell[];
    exam: number | null;
    grade: number | null;
  }

  interface SPRRow {
    studentId: string;
    terms: Record<TermId, SPRTermResult>;
    final: number | null;
  }

  const sprRows: SPRRow[] = useMemo(() => {
    return filteredStudents.map(student => {
      const perTerm = {} as Record<TermId, SPRTermResult>;
      for (const term of terms) {
        const cols = columnsByTerm[term] ?? [];
        const cells: SPRRowCell[] = cols.map(col => {
          const fraction = autoScoreFraction({ column: col, studentId: student.id, submissions: db.submissions, activities: db.activities ?? [], quizzes: db.quizzes });
          const sourceTitle = getSourceTitle(col);
          if (fraction === null) return { score: null, isManual: false, sourceTitle };
          return { score: fraction * col.perfectScore, isManual: false, sourceTitle };
        });
        const scores = cells.map(c => c.score);
        const perfects = cols.map(c => c.perfectScore);
        const cs = classStandingPercent(scores, perfects);
        if (term === 'prelim') {
          // Prelim is class-standing-only: no exam component.
          perTerm[term] = { cells, exam: null, grade: cols.length === 0 ? null : round2(cs) };
        } else {
          const exam = resolveExamScore(courseId, term, student.id, { exams: db.exams, submissions: db.submissions });
          const hasCSData = cells.some(c => c.score !== null);
          perTerm[term] = { cells, exam: exam.score, grade: termGrade(cs, exam.score, exam.perfect, weights, hasCSData || exam.score !== null) };
        }
      }
      const termGrades = {} as Record<TermId, number | null>;
      for (const term of terms) termGrades[term] = perTerm[term].grade;
      // 2-term path equals existing finalPercent(mt, ft, w): same weighted
      // sum of the same term grades with { midterm: 40, finals: 60 }, round2.
      const final = finalPercentTerms(termGrades, termWeights);
      return { studentId: student.id, terms: perTerm, final };
    });
  }, [filteredStudents, columnsByTerm, db.exams, db.submissions, db.activities, db.quizzes, weights, termWeights, courseId, terms]);

  const sprRowById = useMemo(() => {
    const map = new Map<string, SPRRow>();
    for (const r of sprRows) map.set(r.studentId, r);
    return map;
  }, [sprRows]);

  const handleExportExcel = () => {
    if (!course || hasParseError) return;
    const autoConfig = { courseId, prelimColumns: columnsByTerm.prelim, midtermColumns: columnsByTerm.midterm, finalColumns: columnsByTerm.finals, mtExamPerfect: examPerfectByTerm.midterm ?? 100, ftExamPerfect: examPerfectByTerm.finals ?? 100 };
    exportSPRToExcel({
      course,
      roster: students,
      config: autoConfig,
      resolveStudent: (studentId: string) => {
        const row = sprRowById.get(studentId);
        const finalValue = row?.final ?? null;
        const prelim = row?.terms.prelim;
        const mt = row?.terms.midterm;
        const ft = row?.terms.finals;
        return {
          prelimCells: prelim?.cells.map(c => c.score) ?? columnsByTerm.prelim.map(() => null),
          prelimGrade: prelim?.grade ?? null,
          mtCells: mt?.cells.map(c => c.score) ?? columnsByTerm.midterm.map(() => null),
          mtExam: mt?.exam ?? null,
          ftCells: ft?.cells.map(c => c.score) ?? columnsByTerm.finals.map(() => null),
          ftExam: ft?.exam ?? null,
          mtGrade: mt?.grade ?? null,
          ftGrade: ft?.grade ?? null,
          finalPercent: finalValue,
          numerical: finalValue === null ? '' : getTransmutedGrade(finalValue).grade,
        };
      },
    });

    showAlert({
      title: 'Export SPR',
      message: `SPR Excel exported successfully for ${course.code}.`,
      type: 'success'
    });
  };

  // One (columns + exam + grade) group per term, plus roster + final + numerical.
  // Prelim blocks carry no exam column (class-standing-only term).
  // Collapsed terms contribute only their grade column.
  const groupWidth = (t: TermId): number =>
    isCollapsed(t) ? 1 : (columnsByTerm[t]?.length ?? 0) + (t === 'prelim' ? 1 : 2);
  const totalColumns = 1 + terms.reduce((n, t) => n + groupWidth(t), 0) + 2;
  const collapsedCount = terms.filter(t => isCollapsed(t)).length;
  const expandAll = () => {
    setCollapsedTerms(new Set());
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(collapseKey, JSON.stringify([]));
    } catch { /* ignore */ }
  };
  const collapseAll = () => {
    setCollapsedTerms(new Set(terms));
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(collapseKey, JSON.stringify(terms));
    } catch { /* ignore */ }
  };

  const exportTitle = students.length === 0
    ? 'No students enrolled to export.'
    : hasParseError
      ? 'Fix the syllabus grading formula before exporting.'
      : autoCols.length === 0
        ? 'No published activities or quizzes to export.'
        : 'Export SPR as Excel (.xlsx)';

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header Controls */}
      <PageHeader
        title="Course Gradebook"
        description={`${course?.code} (${course?.section}) • Official Institutional Grading Matrix`}
        actions={
          <>
            {/* Formula Badge */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold shadow-xs">
              <Calculator className="w-3.5 h-3.5" />
              <span>{weights.formulaLabel}</span>
            </div>

            <button
              type="button"
              onClick={() => setPostingPolicy(prev => (prev === 'manual' ? 'automatic' : 'manual'))}
              className="px-3.5 py-2 rounded-xl border border-border text-xs font-bold flex items-center space-x-2 transition-all bg-card text-foreground hover:bg-muted shadow-subtle active:scale-98 cursor-pointer"
            >
              {postingPolicy === 'manual' ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Policy: Manual Posting</span>
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Policy: Automatic Posting</span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="spr-export-excel"
              onClick={handleExportExcel}
              disabled={students.length === 0 || autoCols.length === 0 || !course || hasParseError}
              title={exportTitle}
              className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all flex items-center space-x-1.5 shadow-subtle active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </>
        }
      />

      {/* Search Input & Legend Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search student by name or student ID (e.g. 2021-SLUC)..."
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30 shadow-subtle"
          />
        </div>

        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
          {terms.map((t, i) => (
            <React.Fragment key={t}>
              {i > 0 ? <span aria-hidden="true">·</span> : null}
              <span className="flex items-center space-x-1">
                <span className={`w-2 h-2 rounded-full ${t === 'prelim' ? 'bg-sky-500' : t === 'midterm' ? 'bg-primary' : 'bg-emerald-500'}`} />
                <span>{TERM_LABELS[t]}: <strong className="text-foreground">{termWeights[t]}%</strong></span>
              </span>
            </React.Fragment>
          ))}
          {terms.map(t => {
            const released = releaseMap[t] === true;
            return (
              <span key={`release-${t}`} className="flex items-center space-x-1">
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${released ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                  {released ? 'Released' : 'Not released'}
                </span>
                <button
                  type="button"
                  data-testid={`grades-release-${t}`}
                  onClick={() => { if (!course) return; void Promise.resolve(setGradesReleased(courseId, t, !released)).catch(() => {}); }}
                  className="px-2 py-0.5 text-[11px] font-bold rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-all cursor-pointer"
                >
                  {released ? 'Un-release' : 'Release'}
                </button>
              </span>
            );
          })}
          <span aria-hidden="true">·</span>
          <span>Passing: <strong className="text-emerald-600 dark:text-emerald-400">75% (3.00)</strong></span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={expandAll}
              disabled={collapsedCount === 0}
              className="font-semibold text-primary hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-default cursor-pointer"
            >
              Expand all
            </button>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              onClick={collapseAll}
              disabled={collapsedCount === terms.length}
              className="font-semibold text-primary hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-default cursor-pointer"
            >
              Collapse all
            </button>
          </span>
        </div>
      </div>

      {weightsDefaulted || legacyUnmappedCount > 0 ? (
        <div className="flex flex-col gap-1 text-[12px]">
          {weightsDefaulted ? (
            <div data-testid="grades-weights-defaulted" className="text-muted-foreground">
              Weights defaulted — equal split (the syllabus formula did not parse into term weights).
            </div>
          ) : null}
          {legacyUnmappedCount > 0 ? (
            <div data-testid="grades-legacy-flag" className="text-muted-foreground">
              {legacyUnmappedCount} item{legacyUnmappedCount === 1 ? '' : 's'} without a term counted under Midterm.
            </div>
          ) : null}
        </div>
      ) : null}

      {hasParseError ? (
        <div data-testid="grades-formula-error" className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-8 text-center shadow-subtle">
          <div className="mx-auto max-w-md space-y-3">
            <h3 className="text-sm font-bold text-foreground">Grading formula needs attention</h3>
            <p className="text-xs text-muted-foreground">
              Grading formula needs attention — the syllabus section &apos;Course Requirements &amp; Official Grading Formula&apos; could not be parsed. Fix it in the Syllabus tab to enable grades.
            </p>
            {onGoToSyllabus ? (
              <button
                type="button"
                onClick={() => onGoToSyllabus()}
                className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-subtle active:scale-98 cursor-pointer"
              >
                Go to Syllabus
              </button>
            ) : null}
          </div>
        </div>
      ) : (isLoading || isSyncing) && autoCols.length === 0 ? (
        <div data-testid="spr-loading" className="bg-card border border-border rounded-2xl overflow-hidden" aria-hidden="true">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-5 py-3 min-w-[232px]">
                    <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                  </th>
                  {terms.map(term => (
                    <th key={`skeleton-group-${term}`} className="px-4 py-2 text-center border-l border-border">
                      <div className="h-4 w-24 rounded bg-muted animate-pulse mx-auto" />
                    </th>
                  ))}
                  <th className="px-4 py-2 text-center border-l border-border">
                    <div className="h-4 w-20 rounded bg-muted animate-pulse mx-auto" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <tr key={`spr-skeleton-${i}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-muted animate-pulse shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
                          <div className="h-2.5 w-1/2 rounded bg-muted/70 animate-pulse" />
                        </div>
                      </div>
                    </td>
                    {terms.map(term => (
                      <td key={`spr-skeleton-${i}-${term}`} className="px-3 py-3.5 text-center border-l border-border">
                        <div className="h-5 w-14 rounded-full bg-muted animate-pulse mx-auto" />
                      </td>
                    ))}
                    <td className="px-3 py-3.5 text-center border-l border-border">
                      <div className="h-5 w-14 rounded-lg bg-muted animate-pulse mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : autoCols.length === 0 ? (
        <div data-testid="spr-empty-state" className="bg-card border border-border rounded-2xl p-8 text-center shadow-subtle">
          <div className="mx-auto max-w-md space-y-3">
            <h3 className="text-sm font-bold text-foreground">No grade columns yet</h3>
            <p className="text-xs text-muted-foreground">
              No grade columns yet — publish an Activity or Quiz and scores will appear here automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {/* Term-group band: one tinted block per grading period. Each
                    group is a collapse toggle — collapsed terms keep only
                    their grade column so wide courses stay scannable. */}
                <tr className="border-b border-border bg-muted/60 text-[11.5px] font-semibold text-muted-foreground">
                  <th
                    rowSpan={2}
                    className="px-5 py-3 min-w-[232px] sticky left-0 bg-muted/60 z-10 text-[12.5px] text-foreground align-bottom"
                  >
                    Student roster name and ID
                  </th>
                  {terms.map(term => {
                    const collapsed = isCollapsed(term);
                    const itemCount = columnsByTerm[term]?.length ?? 0;
                    const hiddenCount = itemCount + (term === 'prelim' ? 0 : 1);
                    const groupCount = groupWidth(term);
                    return (
                      <th
                        key={`group-${term}`}
                        colSpan={groupCount}
                        className="px-2 py-1.5 text-center border-l border-border"
                      >
                        <button
                          type="button"
                          onClick={() => toggleTerm(term)}
                          aria-expanded={!collapsed}
                          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${TERM_LABELS[term]} columns`}
                          title={`${collapsed ? 'Expand' : 'Collapse'} ${TERM_LABELS[term]} (${hiddenCount} column${hiddenCount === 1 ? '' : 's'} hidden)`}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary cursor-pointer transition-colors"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${collapsed ? '-rotate-90' : 'rotate-0'}`}
                            aria-hidden="true"
                          />
                          <span
                            className={`w-2 h-2 rounded-full ${term === 'prelim' ? 'bg-sky-500' : term === 'midterm' ? 'bg-primary' : 'bg-emerald-500'}`}
                            aria-hidden="true"
                          />
                          <span className="text-foreground">{TERM_LABELS[term]}</span>
                          <span className="font-normal tabular-nums">{termWeights[term]}%</span>
                          {collapsed ? (
                            <span className="font-normal text-[11px] tabular-nums">· {hiddenCount} hidden</span>
                          ) : null}
                        </button>
                      </th>
                    );
                  })}
                  <th colSpan={2} className="px-4 py-2 text-center border-l border-border">
                    <span className="text-foreground">Final result</span>
                  </th>
                </tr>
                <tr className="border-b border-border bg-muted/40 text-[11.5px] font-semibold text-muted-foreground">
                  {terms.map(term => {
                    if (isCollapsed(term)) {
                      return (
                        <th key={`${term}-collapsed-grade`} className="px-2 py-2 text-center min-w-[80px] border-l border-border">
                          <span className="text-foreground">{TERM_SHORT[term]} grade</span>
                        </th>
                      );
                    }
                    return (
                      <React.Fragment key={term}>
                        {(columnsByTerm[term] ?? []).map((col, colIdx) => (
                          <th
                            key={`${term}-${col.id}`}
                            className={`px-2 py-2 text-center min-w-[76px] animate-gradebook-cell-in ${colIdx === 0 ? 'border-l border-border' : ''}`}
                          >
                            <div className="font-semibold text-foreground truncate max-w-[96px] mx-auto" title={col.title}>
                              {col.title}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-normal mt-0.5 tabular-nums">
                              / {col.perfectScore}
                            </div>
                          </th>
                        ))}
                        {term === 'prelim' ? null : (
                          <th
                            className={`px-2 py-2 text-center min-w-[72px] animate-gradebook-cell-in ${(columnsByTerm[term]?.length ?? 0) === 0 ? 'border-l border-border' : ''}`}
                          >
                            <div className="font-semibold text-foreground">{TERM_SHORT[term]} exam</div>
                            <div className="text-[11px] text-muted-foreground font-normal mt-0.5 tabular-nums">
                              / {examPerfectByTerm[term] ?? '—'}
                            </div>
                          </th>
                        )}
                        <th className="px-2 py-2 text-center min-w-[80px]">
                          <span className="text-foreground">{TERM_SHORT[term]} grade</span>
                        </th>
                      </React.Fragment>
                    );
                  })}
                  <th className="px-3 py-2.5 text-center min-w-[84px] border-l border-border text-foreground">
                    Final %
                  </th>
                  <th className="px-3 py-2.5 text-center min-w-[100px] text-foreground">
                    Numerical
                    <div className="text-[11px] text-muted-foreground font-normal mt-0.5">
                      1.00 - 5.00 scale
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={totalColumns} className="p-8 text-center text-muted-foreground">
                      {searchQuery ? (
                        <>No student records found matching &quot;{searchQuery}&quot;.</>
                      ) : (
                        <span className="inline-flex flex-col gap-1">
                          <span className="font-semibold text-foreground">No currently enrolled students.</span>
                          <span className="text-xs">Students will appear here once they are enrolled in this course.</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => {
                    const row = sprRowById.get(student.id);
                    const transmuted = getTransmutedGrade(row?.final ?? null);
                    return (
                      <tr key={student.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-[14px] tracking-tight text-foreground sticky left-0 bg-card z-10">
                          <div className="flex items-center space-x-2.5">
                            <img
                              src={student.avatar}
                              alt={student.name}
                              className="w-7 h-7 rounded-full object-cover border border-border shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="truncate">{student.name}</div>
                              <div className="text-[11px] text-muted-foreground font-normal">
                                {student.studentId || '2021-SLUC-0492'} · {student.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {terms.map(term => {
                          const termResult = row?.terms[term];
                          const termCols = columnsByTerm[term] ?? [];
                          const examValue = termResult?.exam;
                          const gradeValue = termResult?.grade;
                          if (isCollapsed(term)) {
                            return (
                              <React.Fragment key={term}>
                                <td className="px-2 py-2.5 text-center border-l border-border">
                                  {gradeValue !== null && gradeValue !== undefined ? (
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border tabular-nums ${term === 'prelim' ? 'text-sky-700 dark:text-sky-400 bg-sky-500/10 border-sky-500/20' : term === 'midterm' ? 'text-primary bg-primary/10 border-primary/20' : 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}>
                                      {gradeValue}%
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground font-normal">—</span>
                                  )}
                                </td>
                              </React.Fragment>
                            );
                          }
                          return (
                            <React.Fragment key={term}>
                              {termCols.map((col, idx) => {
                                const cell = termResult?.cells[idx];
                                const score = cell?.score ?? null;
                                const autoTitle = cell?.sourceTitle ?? null;
                                return (
                                  <td key={`${term}-${col.id}`} className={`px-2 py-2.5 text-center animate-gradebook-cell-in ${idx === 0 ? 'border-l border-border' : ''}`}>
                                    <div className="flex items-center justify-center space-x-1.5">
                                      <span className="inline-block px-1 py-1 text-center text-[13px] font-semibold tabular-nums text-foreground" title={cell?.sourceTitle ?? undefined}>
                                        {score === null ? <span className="text-muted-foreground/40 font-normal">—</span> : round2(score)}
                                      </span>
                                      {!autoTitle ? null : (
                                        <span data-testid="spr-auto-dot" title={`Auto from ${autoTitle}`} className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                                      )}
                                    </div>
                                  </td>
                                );
                              })}

                              {term === 'prelim' ? null : (() => {
                                const examId = examIdByTerm[term];
                                const draftKey = `${term}:${student.id}`;
                                const draft = manualDrafts[draftKey];
                                const display = draft !== undefined ? draft : (examValue === null || examValue === undefined ? '' : String(round2(examValue)));
                                const canEdit = Boolean(examId && upsertManualExamGrade);
                                return (
                                  <td className={`px-2 py-2.5 text-center animate-gradebook-cell-in ${termCols.length === 0 ? 'border-l border-border' : ''}`}>
                                    {canEdit ? (
                                      <input
                                        type="number"
                                        min={0}
                                        max={examPerfectByTerm[term] ?? undefined}
                                        step="0.01"
                                        value={display}
                                        placeholder="—"
                                        disabled={savingManual[draftKey]}
                                        onChange={e => setManualDrafts(prev => ({ ...prev, [draftKey]: e.target.value }))}
                                        onBlur={() => {
                                          if (draft !== undefined && draft.trim() !== '') {
                                            void handleSaveManualExam(term, student.id);
                                          }
                                        }}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            void handleSaveManualExam(term, student.id);
                                          }
                                        }}
                                        title={examId ? `Manual ${TERM_SHORT[term]} exam score (Enter to save)` : 'No exam for this term'}
                                        className="w-16 px-1.5 py-1 text-center text-[13px] font-semibold tabular-nums text-foreground bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center space-x-1">
                                        <span className="inline-block px-1 py-1 text-center text-[13px] font-semibold tabular-nums text-foreground">
                                          {examValue === null || examValue === undefined ? <span className="text-muted-foreground/40 font-normal">—</span> : round2(examValue)}
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                );
                              })()}

                              <td className={`px-2 py-2.5 text-center ${term === 'prelim' && termCols.length === 0 ? 'border-l border-border' : ''}`}>
                                {gradeValue !== null && gradeValue !== undefined ? (
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border tabular-nums ${term === 'prelim' ? 'text-sky-700 dark:text-sky-400 bg-sky-500/10 border-sky-500/20' : term === 'midterm' ? 'text-primary bg-primary/10 border-primary/20' : 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}>
                                    {gradeValue}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground font-normal">—</span>
                                )}
                              </td>
                            </React.Fragment>
                          );
                        })}

                        <td className="px-2 py-2.5 border-l border-border text-center font-semibold text-sm bg-muted/30">
                          {row?.final !== null && row?.final !== undefined ? (
                            <span
                              className={
                                row.final >= 75
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {row.final}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40 font-normal">—</span>
                          )}
                        </td>

                        <td className="p-2 text-center bg-muted/30">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black border ${transmuted.color}`}
                          >
                            {transmuted.grade}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
