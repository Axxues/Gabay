import type { Module } from '@/services/lms/types/lms.types';

export type AssessmentSourceFilter = 'all' | 'module' | 'direct';

export const ASSESSMENT_SOURCE_LABELS: Record<Exclude<AssessmentSourceFilter, 'all'>, string> = {
  module: 'From Module',
  direct: 'Direct',
};

const QUESTION_SET_LINK_PREFIX = 'asg-activity-';

export interface AssessmentSourceIndex {
  classicActivityIds: Set<string>;
  activityIds: Set<string>;
  quizIds: Set<string>;
  moduleTitleByClassicActivity: Map<string, string>;
  moduleTitleByActivity: Map<string, string>;
  moduleTitleByQuiz: Map<string, string>;
}

export function buildAssessmentSourceIndex(
  modules: Module[] | undefined | null,
  courseId: string
): AssessmentSourceIndex {
  const classicActivityIds = new Set<string>();
  const activityIds = new Set<string>();
  const quizIds = new Set<string>();
  const moduleTitleByClassicActivity = new Map<string, string>();
  const moduleTitleByActivity = new Map<string, string>();
  const moduleTitleByQuiz = new Map<string, string>();

  for (const m of modules || []) {
    if (m.courseId !== courseId) continue;
    for (const item of m.items || []) {
      if (item.type === 'activity' && item.activityId) {
        if (item.activityId.startsWith(QUESTION_SET_LINK_PREFIX)) {
          const actId = item.activityId.slice(QUESTION_SET_LINK_PREFIX.length);
          activityIds.add(actId);
          if (!moduleTitleByActivity.has(actId)) moduleTitleByActivity.set(actId, m.title);
        } else {
          classicActivityIds.add(item.activityId);
          if (!moduleTitleByClassicActivity.has(item.activityId))
            moduleTitleByClassicActivity.set(item.activityId, m.title);
        }
      } else if (item.type === 'quiz' && item.quizId) {
        quizIds.add(item.quizId);
        if (!moduleTitleByQuiz.has(item.quizId)) moduleTitleByQuiz.set(item.quizId, m.title);
      }
    }
  }

  return {
    classicActivityIds,
    activityIds,
    quizIds,
    moduleTitleByClassicActivity,
    moduleTitleByActivity,
    moduleTitleByQuiz,
  };
}

export function matchesSourceFilter(
  isFromModule: boolean,
  sourceFilter: AssessmentSourceFilter
): boolean {
  if (sourceFilter === 'all') return true;
  if (sourceFilter === 'module') return isFromModule;
  return !isFromModule;
}
