import { readItems, readItem, createItem } from '@likha-erp/likha-sdk';
import { likha } from '@/services/core/likhaClient';
import type { LikhaAssessment } from '@/services/core/types';
import type { Submission } from '@/services/lms/types/lms.types';

export const assessmentsApi = {
  async listAssessments(courseId?: string): Promise<LikhaAssessment[]> {
    try {
      const options: any = {};
      if (courseId) {
        options.filter = { course_id: { _eq: courseId } };
      }
      const items = await likha.request(readItems('assessments' as any, options));
      return (items as LikhaAssessment[]) || [];
    } catch {
      return [];
    }
  },

  async getAssessmentById(id: string): Promise<LikhaAssessment | null> {
    try {
      const item = await likha.request(readItem('assessments' as any, id));
      return (item as LikhaAssessment) || null;
    } catch {
      return null;
    }
  },

  async submitAssessment(submission: Partial<Submission>): Promise<Submission | null> {
    try {
      const created = await likha.request(
        createItem('submissions' as any, {
          assessment_id: submission.activityId || submission.quizId || submission.examId,
          student_id: submission.studentId,
          course_id: submission.courseId,
          status: 'submitted',
          score: submission.grade ?? null,
          answers: {
            content: submission.content,
            fileUrl: submission.fileUrl,
            fileName: submission.fileName,
            submissionType: submission.submissionType,
          },
          submitted_at: new Date().toISOString(),
        })
      );
      return (created as unknown as Submission) || null;
    } catch {
      return null;
    }
  },

  async getSubmissions(assessmentId: string, studentId?: string): Promise<Submission[]> {
    try {
      const filter: any = { assessment_id: { _eq: assessmentId } };
      if (studentId) {
        filter.student_id = { _eq: studentId };
      }
      const items = await likha.request(readItems('submissions' as any, { filter }));
      return (items as unknown as Submission[]) || [];
    } catch {
      return [];
    }
  },
};
