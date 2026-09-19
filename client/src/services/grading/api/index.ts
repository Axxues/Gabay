import { readItems, createItem, updateItem } from '@likha-erp/likha-sdk';
import { likha } from '@/services/core/likhaClient';
import type { CourseStudentGrade, SPRConfig } from '@/services/lms/types/lms.types';

export const gradingApi = {
  async getStudentGrades(courseId: string): Promise<CourseStudentGrade[]> {
    try {
      const items = await likha.request(
        readItems('grades' as any, {
          filter: { course_id: { _eq: courseId } },
        })
      );
      if (Array.isArray(items)) {
        return items.map((g: any) => ({
          courseId: g.course_id,
          studentId: g.student_id,
          midtermGrade: g.midterm ?? null,
          finalGrade: g.finals ?? null,
          updatedAt: g.updated_at,
        }));
      }
    } catch {
      // Fallback
    }
    return [];
  },

  async updateGrade(grade: Partial<CourseStudentGrade>): Promise<CourseStudentGrade | null> {
    try {
      if (!grade.courseId || !grade.studentId) return null;
      const res = await likha.request(
        createItem('grades' as any, {
          course_id: grade.courseId,
          student_id: grade.studentId,
          midterm: grade.midtermGrade,
          finals: grade.finalGrade,
          updated_at: new Date().toISOString(),
        })
      );
      return {
        courseId: (res as any).course_id,
        studentId: (res as any).student_id,
        midtermGrade: (res as any).midterm,
        finalGrade: (res as any).finals,
      };
    } catch {
      return null;
    }
  },

  async getSPRConfig(courseId: string): Promise<SPRConfig | null> {
    try {
      const items = await likha.request(
        readItems('course_grading_configs' as any, {
          filter: { course_id: { _eq: courseId } },
          limit: 1,
        })
      );
      const conf = (items as any[])?.[0];
      if (conf) {
        return {
          courseId: conf.course_id,
          prelimColumns: conf.prelim_columns || [],
          midtermColumns: conf.midterm_columns || [],
          finalColumns: conf.final_columns || [],
          mtExamPerfect: conf.weights?.mtExamPerfect || 100,
          ftExamPerfect: conf.weights?.ftExamPerfect || 100,
        };
      }
    } catch {
      // Fallback
    }
    return null;
  },
};
