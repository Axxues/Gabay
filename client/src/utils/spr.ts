// src/utils/spr.ts
import type {
  Activity,
  Exam,
  Quiz,
  SPRColumn,
  SPRWeights,
  Submission,
} from '@/services/lms/types/lms.types';
import type { TermId } from './gradingTerms';
import { normalizeTermId } from './gradingTerms';

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function resolveSPRWeights(
  syllabusGrading: { termFormula?: string; finalFormula?: string } | null | undefined,
): SPRWeights {
  const fallback = (): SPRWeights => ({ csWeight: 60, examWeight: 40, mtWeight: 40, ftWeight: 60, formulaLabel: 'Term 60% CS + 40% Exam · Final 40% MT + 60% FT', parseError: true });
  if (!syllabusGrading) return { csWeight: 60, examWeight: 40, mtWeight: 40, ftWeight: 60, formulaLabel: 'Term 60% CS + 40% Exam · Final 40% MT + 60% FT' };
  const term = syllabusGrading.termFormula ?? '';
  const fin = syllabusGrading.finalFormula ?? '';
  const nums = (s: string) => [...s.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(m => Number(m[1]));
  const tn = nums(term), fn = nums(fin);
  const sumOk = (a: number[]) => a.length >= 2 && Math.abs(a[0] + a[1] - 100) < 0.01;
  // term: first % = class standing, second % = exam; final: first % = midterm, second % = final term
  if (!sumOk(tn) || !sumOk(fn)) return fallback();
  return { csWeight: tn[0], examWeight: tn[1], mtWeight: fn[0], ftWeight: fn[1], formulaLabel: `Term ${tn[0]}% CS + ${tn[1]}% Exam · Final ${fn[0]}% MT + ${fn[1]}% FT` };
}

export function classStandingPercent(scores: Array<number | null>, perfects: number[]): number {
  const totalPerfect = perfects.reduce((sum, p) => sum + p, 0);
  if (totalPerfect <= 0) return 0;
  const earned = perfects.reduce((sum, perfect, i) => {
    const s = scores[i] ?? 0;
    return sum + Math.min(Math.max(s, 0), perfect);
  }, 0);
  return (earned / totalPerfect) * 100;
}

export function termGrade(
  csPercent: number,
  examScore: number | null,
  examPerfect: number,
  w: SPRWeights,
  hasClassStandingData?: boolean,
): number | null {
  // Auto-compute when at least one component has a score:
  // - both present -> weighted 60/40 (default)
  // - exam missing but CS has ≥1 graded cell -> CS-only interim grade
  //   (same as prelim) so the term doesn't stay blank.
  // - neither -> null (dash).
  if (examScore === null || examPerfect <= 0) {
    if (hasClassStandingData) return round2(csPercent);
    return null;
  }
  return round2((csPercent * w.csWeight + ((examScore / examPerfect) * 100 * w.examWeight)) / 100);
}

export function finalPercent(mt: number | null, ft: number | null, w: SPRWeights): number | null {
  if (mt === null || ft === null) return null;
  return round2((mt * w.mtWeight + ft * w.ftWeight) / 100);
}

function quizPointsPossible(quiz: Quiz): number {
  return quiz.questions.reduce((sum, q) => sum + (q.points ?? 0), 0);
}

export function buildAutoColumns(courseId: string, db: { activities?: Activity[]; quizzes: Quiz[] }): SPRColumn[] {
  const cols: SPRColumn[] = [];
  for (const a of db.activities ?? []) {
    if (a.courseId !== courseId || !a.published) continue;
    cols.push({ id: `auto-activity-${a.id}`, title: a.title, perfectScore: Math.max(1, a.pointsPossible || 0), linkedSource: { kind: 'activity', sourceId: a.id } });
  }
  for (const q of db.quizzes ?? []) {
    if (q.courseId !== courseId || !q.published) continue;
    const pts = q.questions.reduce((s, qq) => s + (qq.points ?? 0), 0);
    cols.push({ id: `auto-quiz-${q.id}`, title: q.title, perfectScore: Math.max(1, pts), linkedSource: { kind: 'quiz', sourceId: q.id } });
  }
  return cols;
}

export function autoScoreFraction(args: {
  column: SPRColumn;
  studentId: string;
  submissions: Submission[];
  activities: Activity[];
  quizzes: Quiz[];
  exams?: Exam[];
}): number | null {
  const { column, studentId, submissions, activities, quizzes, exams } = args;
  const link = column.linkedSource;
  if (!link) return null;

  let activityKey: string;
  let divisor: number;
  if (link.kind === 'activity') {
    const source = activities.find((a) => a.id === link.sourceId);
    if (!source) return null;
    if (source.format === 'classic') {
      if (typeof source.pointsPossible !== 'number' || source.pointsPossible <= 0) return null;
      activityKey = link.sourceId;
      divisor = source.pointsPossible;
    } else {
      if (typeof source.pointsPossible !== 'number' || source.pointsPossible <= 0) return null;
      activityKey = `asg-activity-${link.sourceId}`;
      divisor = 100;
    }
  } else if (link.kind === 'quiz') {
    const source = quizzes.find((q) => q.id === link.sourceId);
    if (!source) return null;
    if (quizPointsPossible(source) <= 0) return null;
    activityKey = `asg-quiz-${link.sourceId}`;
    divisor = 100;
  } else if (link.kind === 'exam') {
    const source = (exams ?? []).find((e) => e.id === link.sourceId);
    if (!source) return null;
    const pts = source.questions.reduce((s, qq) => s + (qq.points ?? 0), 0);
    if (pts <= 0) return null;
    activityKey = `asg-exam-${link.sourceId}`;
    divisor = pts;
  } else {
    return null;
  }

  const candidates = submissions.filter(
    (s) =>
      s.studentId === studentId &&
      s.activityKey === activityKey &&
      s.status === 'graded' &&
      typeof s.grade === 'number' &&
      !Number.isNaN(s.grade),
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const ka = a.gradedAt ?? a.submittedAt ?? '';
    const kb = b.gradedAt ?? b.submittedAt ?? '';
    if (kb > ka) return 1;
    if (kb < ka) return -1;
    return 0;
  });
  const grade = candidates[0].grade as number;
  const fraction = grade / divisor;
  return Math.min(Math.max(fraction, 0), 1);
}

export function resolveExamScore(courseId: string, term: 'midterm' | 'final' | TermId, studentId: string, db: { exams?: Exam[]; submissions: Submission[] }): { score: number | null; perfect: number } {
  // Task 7: accept TermId. Stored rows read legacy 'final' as 'finals'
  // (normalizeExam on load), so compare normalized on both sides; a legacy
  // 'final' lookup still matches either stored shape.
  const want = normalizeTermId(term);
  const exam = (db.exams ?? []).find(e => e.courseId === courseId && e.published && normalizeTermId(e.term) === want);
  if (!exam) return { score: null, perfect: 100 };
  const pts = exam.questions.reduce((s, q) => s + (q.points ?? 0), 0);
  const perfect = Math.max(1, pts);
  const cands = db.submissions.filter(s => s.studentId === studentId && s.activityKey === `asg-exam-${exam.id}` && s.status === 'graded' && typeof s.grade === 'number');
  if (!cands.length) return { score: null, perfect };
  cands.sort((a, b) => String(b.gradedAt ?? b.submittedAt ?? '') > String(a.gradedAt ?? a.submittedAt ?? '') ? 1 : -1);
  return { score: Math.min(Math.max(cands[0].grade as number, 0), perfect), perfect };
}

export interface TermWeightsResult {
  weights: Record<TermId, number>;
  defaulted: boolean;
}

export function extractTermWeights(
  grading: { termFormula?: string; finalFormula?: string } | null | undefined,
  terms: TermId[],
): TermWeightsResult {
  const equalSplit = (): TermWeightsResult => {
    const weights = {} as Record<TermId, number>;
    if (terms.length === 2 && terms.includes('midterm') && terms.includes('finals')) {
      weights['midterm'] = 40; weights['finals'] = 60;
    } else if (terms.length === 1) {
      weights[terms[0]] = 100;
    } else {
      const each = Math.floor(10000 / terms.length) / 100;
      terms.forEach((t, i) => { weights[t] = i === terms.length - 1 ? round2(100 - each * (terms.length - 1)) : each; });
    }
    return { weights, defaulted: true };
  };
  const text = `${grading?.termFormula ?? ''}\n${grading?.finalFormula ?? ''}`;
  const found: Partial<Record<TermId, number>> = {};
  for (const term of terms) {
    const labels = term === 'prelim' ? ['prelim'] : term === 'midterm' ? ['midterm'] : ['final'];
    // Multiple mentions can match (e.g. generic "Final Grade = 60%" vs "40% finals"):
    // prefer the number closest to a term mention; later mentions win ties.
    // The gap excludes digits/% so one weight can't swallow another ("60% ... + 40% finals").
    const labelAlt = labels.join('|');
    const beforeRe = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*%([^.\\n\\d%]{0,80})((?:${labelAlt}))`, 'gi');
    const afterRe = new RegExp(`((?:${labelAlt}))([^.\\n\\d%]{0,80})(\\d+(?:\\.\\d+)?)\\s*%`, 'gi');
    let best: number | undefined;
    let bestGap = Infinity;
    for (const m of text.matchAll(beforeRe)) {
      const gap = (m[2] ?? '').length;
      if (gap <= bestGap) { bestGap = gap; best = Number(m[1]); }
    }
    for (const m of text.matchAll(afterRe)) {
      const gap = (m[2] ?? '').length;
      if (gap <= bestGap) { bestGap = gap; best = Number(m[3]); }
    }
    if (best !== undefined) found[term] = best;
  }
  const vals = terms.map(t => found[t]);
  if (vals.some(v => v === undefined)) return equalSplit();
  const total = (vals as number[]).reduce((s, v) => s + v, 0);
  if (Math.abs(total - 100) > 0.01) return equalSplit();
  return { weights: Object.fromEntries(terms.map(t => [t, found[t]!])) as Record<TermId, number>, defaulted: false };
}

export function finalPercentTerms(
  termGrades: Record<TermId, number | null>,
  weights: Record<TermId, number>,
): number | null {
  let acc = 0;
  for (const [term, weight] of Object.entries(weights) as [TermId, number][]) {
    const g = termGrades[term];
    if (g === null || g === undefined) return null;
    acc += (g * weight) / 100;
  }
  return round2(acc);
}

export interface TermBucketing {
  columnsByTerm: Record<TermId, SPRColumn[]>;
  legacyUnmappedCount: number;
}

// Bucket auto columns by source-item term for every term set, including the
// classic ['midterm','finals'] pair: each activity/quiz renders
// only in its own term block. Legacy/unmapped tags fall back to midterm
// (counted for the one-time UI flag).
export function bucketColumnsByTerm(
  allCols: SPRColumn[],
  db: { activities?: Activity[]; quizzes?: Quiz[] },
  terms: TermId[],
): TermBucketing {
  const columnsByTerm: Record<TermId, SPRColumn[]> = { prelim: [], midterm: [], finals: [] };
  let legacyUnmappedCount = 0;
  const fallback: TermId = terms.includes('midterm') ? 'midterm' : (terms[0] ?? 'midterm');
  for (const col of allCols) {
    const link = col.linkedSource;
    let routed: TermId | null = null;
    if (link?.kind === 'activity') {
      routed = normalizeTermId((db.activities ?? []).find(a => a.id === link.sourceId)?.term);
    } else if (link?.kind === 'quiz') {
      routed = normalizeTermId((db.quizzes ?? []).find(q => q.id === link.sourceId)?.term);
    }
    if (routed !== null && terms.includes(routed)) {
      columnsByTerm[routed].push(col);
    } else {
      legacyUnmappedCount += 1;
      columnsByTerm[fallback].push(col);
    }
  }
  return { columnsByTerm, legacyUnmappedCount };
}
