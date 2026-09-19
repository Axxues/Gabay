// src/utils/activities.ts
import type { QuizQuestion } from '@/services/lms/types/lms.types';

export interface ActivityQuestionScore {
  earned: number;
  possible: number;
  auto: boolean;
}

export interface ActivityScore {
  earned: number;
  possible: number;
  percent: number;
  needsReview: boolean;
  perQuestion: Record<string, ActivityQuestionScore>;
}

const GRADABLE = new Set(['multiple_choice', 'identification', 'true_false', 'essay']);

export function activityPointsPossible(questions: QuizQuestion[]): number {
  return questions.reduce((sum, q) => (GRADABLE.has(q.type) ? sum + (q.points || 0) : sum), 0);
}

export function scoreActivityQuestions(
  questions: QuizQuestion[],
  answers: Record<string, string>
): ActivityScore {
  let earned = 0;
  let possible = 0;
  let needsReview = false;
  const perQuestion: Record<string, ActivityQuestionScore> = {};

  for (const q of questions) {
    if (!GRADABLE.has(q.type)) continue;
    const qPts = q.points || 0;
    possible += qPts;
    const userAns = (answers[q.id] || '').trim();

    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      const hit = userAns === (q.correctAnswer || '').trim();
      perQuestion[q.id] = { earned: hit ? qPts : 0, possible: qPts, auto: true };
      if (hit) earned += qPts;
    } else if (q.type === 'identification') {
      const hit = userAns.toLowerCase() === (q.correctAnswer || '').trim().toLowerCase();
      perQuestion[q.id] = { earned: hit ? qPts : 0, possible: qPts, auto: true };
      if (hit) earned += qPts;
    } else {
      // essay: never auto-scored; faculty grades in SpeedGrader
      needsReview = true;
      perQuestion[q.id] = { earned: 0, possible: qPts, auto: false };
    }
  }

  return { earned, possible, percent: Math.round((earned / (possible || 1)) * 100), needsReview, perQuestion };
}
