// src/utils/spr.test.ts
import { describe, expect, it } from 'vitest';
import {
  autoScoreFraction,
  bucketColumnsByTerm,
  buildAutoColumns,
  classStandingPercent,
  finalPercent,
  resolveSPRWeights,
  resolveExamScore,
  round2,
  termGrade,
} from './spr';
import type {
  Activity,
  Exam,
  Quiz,
  SPRColumn,
  Submission,
} from '@/services/lms/types/lms.types';

function baseWeights() {
  return resolveSPRWeights(null);
}

function makeSubmission(over: Partial<Submission> & { activityKey: string; studentId: string }): Submission {
  return {
    id: 'sub-1',
    courseId: 'c1',
    studentName: 'S',
    studentAvatar: '',
    submittedAt: '2026-01-01T00:00:00.000Z',
    submissionType: 'online_text',
    status: 'graded',
    rubricScores: {},
    comments: [],
    ...over,
  } as Submission;
}

function makeActivity(over: Partial<Activity> & { id: string }): Activity {
  return {
    courseId: 'c1',
    title: 'A',
    instructions: '',
    term: 'midterm',
    questions: [],
    pointsPossible: 100,
    published: true,
    format: 'classic',
    ...over,
  } as Activity;
}

describe('resolveSPRWeights', () => {
  it('returns term 60/40 + final 40/60 defaults', () => {
    expect(baseWeights()).toEqual({
      csWeight: 60,
      examWeight: 40,
      mtWeight: 40,
      ftWeight: 60,
      formulaLabel: 'Term 60% CS + 40% Exam · Final 40% MT + 60% FT',
    });
  });
  it('parses 70/30 term + 50/50 final from syllabus strings', () => {
    const w = resolveSPRWeights({ termFormula: 'Term = 70% Class Standing + 30% Exam', finalFormula: 'Final = 50% Midterm + 50% Final Term' });
    expect(w.csWeight).toBe(70);
    expect(w.examWeight).toBe(30);
    expect(w.mtWeight).toBe(50);
    expect(w.ftWeight).toBe(50);
    expect(w.parseError).toBeFalsy();
  });
  it('flags unparseable formula instead of silent fallback', () => {
    const w = resolveSPRWeights({ termFormula: 'grades are vibes', finalFormula: '' });
    expect(w.parseError).toBe(true);
  });
});

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect(round2(81.333333)).toBe(81.33);
    expect(round2(81.2)).toBe(81.2);
    expect(round2(2.345)).toBe(2.35);
  });
});

describe('classStandingPercent', () => {
  it('treats blanks as zero', () => {
    expect(classStandingPercent([30, null, 7], [30, 100, 10])).toBeCloseTo((37 / 140) * 100, 5);
  });
  it('caps scores at perfect and floors negatives at zero', () => {
    expect(classStandingPercent([200, -5], [100, 50])).toBeCloseTo((100 / 150) * 100, 5);
  });
  it('returns 0 when total perfect is zero or inputs are empty', () => {
    expect(classStandingPercent([], [])).toBe(0);
    expect(classStandingPercent([10], [0])).toBe(0);
    expect(classStandingPercent([10, 20], [0, -5])).toBe(0);
  });
});

describe('termGrade', () => {
  it('applies 60% CS + 40% exam weighting', () => {
    const w = baseWeights();
    // 80 * 0.6 + 50 * 0.4 = 68
    expect(termGrade(80, 50, 100, w)).toBe(68);
  });
  it('converts raw exam points via examPerfect', () => {
    const w = baseWeights();
    // (80*60 + 50/60*100*40)/100 = 81.33
    expect(termGrade(80, 50, 60, w)).toBeCloseTo(81.33, 2);
  });
  it('returns null without an exam score or valid exam perfect', () => {
    const w = baseWeights();
    expect(termGrade(80, null, 100, w)).toBeNull();
    expect(termGrade(80, 50, 0, w)).toBeNull();
    expect(termGrade(80, 50, -10, w)).toBeNull();
  });
});

describe('finalPercent', () => {
  it('applies 40% MT + 60% FT weighting', () => {
    const w = baseWeights();
    expect(finalPercent(68, 90, w)).toBe(81.2);
  });
  it('returns null when either term is null', () => {
    const w = baseWeights();
    expect(finalPercent(68, null, w)).toBeNull();
    expect(finalPercent(null, 90, w)).toBeNull();
  });
});

describe('autoScoreFraction', () => {
  const col = (linkedSource?: SPRColumn['linkedSource']): SPRColumn => ({
    id: 'col-1',
    title: 'Q1',
    perfectScore: 100,
    linkedSource,
  });

  it('returns null when unlinked', () => {
    expect(
      autoScoreFraction({ column: col(), studentId: 's1', submissions: [], activities: [], quizzes: [] }),
    ).toBeNull();
  });

  it('scores classic activity submissions as raw points fraction', () => {
    const activities = [makeActivity({ id: 'a1', pointsPossible: 50 })];
    const submissions = [makeSubmission({ activityKey: 'a1', studentId: 's1', grade: 25 })];
    expect(
      autoScoreFraction({
        column: col({ kind: 'activity', sourceId: 'a1' }),
        studentId: 's1',
        submissions,
        activities,
        quizzes: [],
      }),
    ).toBeCloseTo(0.5, 5);
  });

  it('scores quiz submissions as percent fraction', () => {
    const quizzes: Quiz[] = [{ id: 'q1', courseId: 'c1', title: 'Q', instructions: '', timeLimitMinutes: 10, published: true, questions: [{ id: 'qq1', text: 'Q', type: 'multiple_choice', points: 10 }] } as Quiz];
    const submissions = [makeSubmission({ activityKey: 'asg-quiz-q1', studentId: 's1', grade: 80 })];
    expect(
      autoScoreFraction({
        column: col({ kind: 'quiz', sourceId: 'q1' }),
        studentId: 's1',
        submissions,
        activities: [],
        quizzes,
      }),
    ).toBeCloseTo(0.8, 5);
  });

  it('scores questionset activity submissions as percent fraction', () => {
    const activities: Activity[] = [
      { id: 'act1', courseId: 'c1', title: 'Act', instructions: '', term: 'midterm', questions: [], pointsPossible: 20, published: true, format: 'questionset' } as Activity,
    ];
    const submissions = [makeSubmission({ activityKey: 'asg-activity-act1', studentId: 's1', grade: 90 })];
    expect(
      autoScoreFraction({
        column: col({ kind: 'activity', sourceId: 'act1' }),
        studentId: 's1',
        submissions,
        activities,
        quizzes: [],
      }),
    ).toBeCloseTo(0.9, 5);
  });

  it('picks the latest graded submission and ignores ungraded ones', () => {
    const activities = [makeActivity({ id: 'a1', pointsPossible: 100 })];
    const submissions = [
      makeSubmission({ id: 'old', activityKey: 'a1', studentId: 's1', grade: 10, submittedAt: '2026-01-01T00:00:00.000Z', gradedAt: '2026-01-02T00:00:00.000Z' }),
      makeSubmission({ id: 'new', activityKey: 'a1', studentId: 's1', grade: 70, submittedAt: '2026-02-01T00:00:00.000Z', gradedAt: '2026-02-02T00:00:00.000Z' }),
      makeSubmission({ id: 'ungraded', activityKey: 'a1', studentId: 's1', submittedAt: '2026-03-01T00:00:00.000Z', status: 'submitted' }),
    ];
    expect(
      autoScoreFraction({
        column: col({ kind: 'activity', sourceId: 'a1' }),
        studentId: 's1',
        submissions,
        activities,
        quizzes: [],
      }),
    ).toBeCloseTo(0.7, 5);
  });

  it('returns null when source is missing, has no points, or has no graded submission', () => {
    const args = { studentId: 's1', submissions: [] as Submission[], activities: [] as Activity[], quizzes: [] as Quiz[] };
    // missing source
    expect(autoScoreFraction({ ...args, column: col({ kind: 'activity', sourceId: 'nope' }) })).toBeNull();
    // zero pointsPossible
    expect(
      autoScoreFraction({ ...args, column: col({ kind: 'activity', sourceId: 'a1' }), activities: [makeActivity({ id: 'a1', pointsPossible: 0 })] }),
    ).toBeNull();
    // no graded submission
    expect(
      autoScoreFraction({
        ...args,
        column: col({ kind: 'activity', sourceId: 'a1' }),
        activities: [makeActivity({ id: 'a1' })],
        submissions: [makeSubmission({ activityKey: 'a1', studentId: 's1', status: 'submitted' })],
      }),
    ).toBeNull();
  });

  it('clamps fractions to 0..1', () => {
    const activities = [makeActivity({ id: 'a1', pointsPossible: 100 })];
    const over = [makeSubmission({ activityKey: 'a1', studentId: 's1', grade: 500 })];
    const under = [makeSubmission({ activityKey: 'a1', studentId: 's1', grade: -20 })];
    const colA = col({ kind: 'activity', sourceId: 'a1' });
    expect(autoScoreFraction({ column: colA, studentId: 's1', submissions: over, activities, quizzes: [] })).toBe(1);
    expect(autoScoreFraction({ column: colA, studentId: 's1', submissions: under, activities, quizzes: [] })).toBe(0);
  });

  it('builds auto columns from published activities+quizzes, skipping drafts', () => {
    const cols = buildAutoColumns('c1', {
      activities: [{ id: 'a1', courseId: 'c1', title: 'Act', published: true, pointsPossible: 20, format: 'questionset' } as Activity],
      quizzes: [{ id: 'q1', courseId: 'c1', title: 'Q', published: true, questions: [{ points: 10 }] } as unknown as Quiz, { id: 'q2', courseId: 'c1', title: 'Draft', published: false, questions: [] } as unknown as Quiz],
    });
    expect(cols.map(c => c.linkedSource?.sourceId).sort()).toEqual(['a1', 'q1']);
  });
  it('builds an auto column for each published classic activity', () => {
    const cols = buildAutoColumns('c1', {
      activities: [
        makeActivity({ id: 'asg1', courseId: 'c1', title: 'Lab 1', published: true, pointsPossible: 50 }),
        makeActivity({ id: 'asg2', courseId: 'c1', title: 'Draft', published: false, pointsPossible: 50 }),
        makeActivity({ id: 'asg3', courseId: 'other', title: 'Other course', published: true, pointsPossible: 50 }),
      ],
      quizzes: [],
    });
    expect(cols.map(c => c.linkedSource)).toEqual([{ kind: 'activity', sourceId: 'asg1' }]);
    expect(cols[0].title).toBe('Lab 1');
    expect(cols[0].perfectScore).toBe(50);
  });
  it('scores exam submissions as percent fraction', () => {
    const exams = [{ id: 'e1', courseId: 'c1', title: 'MT', published: true, term: 'midterm', questions: [{ points: 60 }] } as unknown as Exam];
    const subs = [makeSubmission({ activityKey: 'asg-exam-e1', studentId: 's1', grade: 45 })];
    expect(autoScoreFraction({ column: col({ kind: 'exam', sourceId: 'e1' }), studentId: 's1', submissions: subs, activities: [], quizzes: [], exams })).toBeCloseTo(0.75, 5);
  });
  it('clamps exam raw scores to [0, perfect]', () => {
    const exams = [{ id: 'e1', courseId: 'c1', title: 'MT', published: true, term: 'midterm', questions: [{ points: 60 }] } as unknown as Exam];
    const over = [makeSubmission({ activityKey: 'asg-exam-e1', studentId: 's1', grade: 500 })];
    expect(resolveExamScore('c1', 'midterm', 's1', { exams, submissions: over }).score).toBe(60);
  });
  it('routes tagged classic activities to their term bucket', () => {
    const tagged = makeActivity({ id: 'asg1', courseId: 'c1', title: 'Lab', published: true, pointsPossible: 50, term: 'prelim' });
    const untagged = { ...makeActivity({ id: 'asg2', courseId: 'c1', title: 'Lab 2', published: true, pointsPossible: 50 }), term: undefined } as unknown as Activity;
    const cols = buildAutoColumns('c1', { activities: [tagged, untagged], quizzes: [] });
    const { columnsByTerm, legacyUnmappedCount } = bucketColumnsByTerm(
      cols,
      { activities: [tagged, untagged], quizzes: [] },
      ['prelim', 'midterm', 'finals'],
    );
    expect(columnsByTerm.prelim.map(c => c.linkedSource?.sourceId)).toEqual(['asg1']);
    expect(columnsByTerm.midterm.map(c => c.linkedSource?.sourceId)).toEqual(['asg2']);
    expect(legacyUnmappedCount).toBe(1);
  });
  it('routes tagged items to their own bucket under the classic midterm/finals pair', () => {
    const activities: Activity[] = [
      { id: 'act-mt', courseId: 'c1', title: 'Act 4 midterms', published: true, pointsPossible: 150, term: 'midterm', format: 'questionset' } as Activity,
      { id: 'act-ft', courseId: 'c1', title: 'finals, act 1', published: true, pointsPossible: 100, term: 'finals', format: 'questionset' } as Activity,
    ];
    const quizzes: Quiz[] = [
      { id: 'q-mt', courseId: 'c1', title: 'Quiz 1', published: true, term: 'midterm', questions: [{ points: 220 }] } as unknown as Quiz,
      { id: 'q-ft', courseId: 'c1', title: 'Quiz 2', published: true, term: 'finals', questions: [{ points: 220 }] } as unknown as Quiz,
    ];
    const cols = buildAutoColumns('c1', { activities, quizzes });
    const { columnsByTerm, legacyUnmappedCount } = bucketColumnsByTerm(
      cols,
      { activities, quizzes },
      ['midterm', 'finals'],
    );
    expect(columnsByTerm.midterm.map(c => c.linkedSource?.sourceId).sort()).toEqual(['act-mt', 'q-mt']);
    expect(columnsByTerm.finals.map(c => c.linkedSource?.sourceId).sort()).toEqual(['act-ft', 'q-ft']);
    expect(legacyUnmappedCount).toBe(0);
  });
  it('falls back untagged legacy items to midterm under the classic pair', () => {
    const untagged = { ...makeActivity({ id: 'asg2', courseId: 'c1', title: 'Lab 2', published: true, pointsPossible: 50 }), term: undefined } as unknown as Activity;
    const cols = buildAutoColumns('c1', { activities: [untagged], quizzes: [] });
    const { columnsByTerm, legacyUnmappedCount } = bucketColumnsByTerm(
      cols,
      { activities: [untagged], quizzes: [] },
      ['midterm', 'finals'],
    );
    expect(columnsByTerm.midterm.map(c => c.linkedSource?.sourceId)).toEqual(['asg2']);
    expect(columnsByTerm.finals).toEqual([]);
    expect(legacyUnmappedCount).toBe(1);
  });
});

import { extractTermWeights, finalPercentTerms } from './spr';

describe('extractTermWeights', () => {
  it('parses 3-term weights from formula text', () => {
    const w = extractTermWeights(
      { termFormula: 'Prelim Grade 30%, Midterm Grade 30%', finalFormula: 'Final Grade = 60% class standing + 40% finals' },
      ['prelim', 'midterm', 'finals'],
    );
    expect(w.weights).toEqual({ prelim: 30, midterm: 30, finals: 40 });
    expect(w.defaulted).toBe(false);
  });
  it('keeps 2-term 40/60 behavior', () => {
    const w = extractTermWeights(
      { termFormula: 'Midterm Grade / Final Term Grade = 60% Class Standing + 40% ME / FE', finalFormula: 'Final Grade = 40% Midterm Grade + 60% Final Term Grade' },
      ['midterm', 'finals'],
    );
    expect(w.weights).toEqual({ midterm: 40, finals: 60 });
    expect(w.defaulted).toBe(false);
  });
  it('falls back to equal split with defaulted flag on garbage', () => {
    const w = extractTermWeights({ termFormula: 'see handbook', finalFormula: '' }, ['prelim', 'midterm', 'finals']);
    expect(w.weights).toEqual({ prelim: 33.33, midterm: 33.33, finals: 33.34 });
    expect(w.defaulted).toBe(true);
  });
});

describe('finalPercentTerms', () => {
  it('weights term grades; null term nulls the final', () => {
    expect(finalPercentTerms({ prelim: 80, midterm: 90, finals: 70 }, { prelim: 30, midterm: 30, finals: 40 })).toBeCloseTo(79, 2);
    expect(finalPercentTerms({ prelim: null, midterm: 90, finals: 70 }, { prelim: 30, midterm: 30, finals: 40 })).toBeNull();
  });
});
