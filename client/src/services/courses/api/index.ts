import { readItems, readItem, createItem, updateItem } from '@likha-erp/likha-sdk';
import { likha } from '@/services/core/likhaClient';
import type { Course, Module } from '@/services/lms/types/lms.types';
import type { LikhaCourseEnrollment } from '@/services/core/types';

export function mapLikhaCourseToCourse(item: any): Course {
  return {
    id: item.id,
    code: item.code || '',
    title: item.title || '',
    section: item.section || 'BSIT 3-A',
    term: item.term || '1st Semester 2026-2027',
    instructorId: item.instructor_id || '',
    instructorName: item.instructor_name || 'Faculty Member',
    published: item.published !== false,
    credits: item.credits || 3,
    enrolledCount: item.enrolled_count || 0,
    syllabus: item.syllabus || null,
    sectionIds: item.sections ? item.sections.map((s: any) => s.name) : [],
  };
}

export function mapLikhaModuleToModule(item: any): Module {
  return {
    id: item.id,
    courseId: item.course_id,
    title: item.title,
    order: item.order || 1,
    items: Array.isArray(item.items) ? item.items : [],
  };
}

export const coursesApi = {
  async listCourses(): Promise<Course[]> {
    try {
      const items = await likha.request(readItems('courses' as any));
      if (Array.isArray(items) && items.length > 0) {
        return items.map(mapLikhaCourseToCourse);
      }
    } catch {
      // Fallback for offline resilience
    }
    return [];
  },

  async getCourseById(id: string): Promise<Course | null> {
    try {
      const item = await likha.request(readItem('courses' as any, id));
      if (item) return mapLikhaCourseToCourse(item);
    } catch {
      // Fallback
    }
    return null;
  },

  async getCourseModules(courseId: string): Promise<Module[]> {
    try {
      const items = await likha.request(
        readItems('course_modules' as any, {
          filter: { course_id: { _eq: courseId } },
          sort: ['order'],
        })
      );
      if (Array.isArray(items)) {
        return items.map(mapLikhaModuleToModule);
      }
    } catch {
      // Fallback
    }
    return [];
  },

  async getCourseEnrollments(courseId: string): Promise<LikhaCourseEnrollment[]> {
    try {
      const items = await likha.request(
        readItems('course_enrollments' as any, {
          filter: { course_id: { _eq: courseId } },
        })
      );
      return (items as LikhaCourseEnrollment[]) || [];
    } catch {
      return [];
    }
  },

  async createCourse(course: Partial<Course>): Promise<Course | null> {
    try {
      const created = await likha.request(
        createItem('courses' as any, {
          code: course.code,
          title: course.title,
          section: course.section,
          term: course.term,
          credits: course.credits,
          published: course.published,
          syllabus: course.syllabus,
        })
      );
      return mapLikhaCourseToCourse(created);
    } catch {
      return null;
    }
  },
};
