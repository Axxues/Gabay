import { readItems, createItem } from '@likha-erp/likha-sdk';
import { likha } from '@/services/core/likhaClient';
import type { CalendarEvent } from '@/services/lms/types/lms.types';

export const calendarApi = {
  async listEvents(courseId?: string): Promise<CalendarEvent[]> {
    try {
      const options: any = { sort: ['date'] };
      if (courseId) {
        options.filter = {
          _or: [{ course_id: { _eq: courseId } }, { course_id: { _null: true } }],
        };
      }
      const items = await likha.request(readItems('calendar_events' as any, options));
      if (Array.isArray(items)) {
        return items.map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          time: e.start_time ? `${e.start_time} - ${e.end_time || ''}` : 'All Day',
          courseId: e.course_id || undefined,
          type: e.type || 'event',
          description: e.description || '',
        }));
      }
    } catch {
      // Fallback
    }
    return [];
  },

  async createEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    try {
      const created = await likha.request(
        createItem('calendar_events' as any, {
          course_id: event.courseId,
          title: event.title,
          date: event.date,
          description: event.description,
          type: event.type,
        })
      );
      const e = created as any;
      return {
        id: e.id,
        title: e.title,
        date: e.date,
        time: event.time || 'All Day',
        courseId: e.course_id,
        type: e.type,
        description: e.description,
      };
    } catch {
      return null;
    }
  },
};
