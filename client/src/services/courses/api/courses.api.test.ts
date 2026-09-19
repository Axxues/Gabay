import { describe, it, expect, vi } from 'vitest';
import { coursesApi } from './index';
import { likha } from '@/services/core/likhaClient';

describe('coursesApi', () => {
  it('should be defined and expose course querying functions', () => {
    expect(coursesApi).toBeDefined();
    expect(typeof coursesApi.listCourses).toBe('function');
    expect(typeof coursesApi.getCourseById).toBe('function');
    expect(typeof coursesApi.getCourseModules).toBe('function');
  });

  it('should return mapped courses when likha returns items', async () => {
    vi.spyOn(likha, 'request').mockResolvedValueOnce([
      { id: 'c1', code: 'TEST 101', title: 'Test Course', section: 'BSIT 3-A', credits: 3 }
    ] as any);
    const courses = await coursesApi.listCourses();
    expect(courses.length).toBe(1);
    expect(courses[0].code).toBe('TEST 101');
    expect(courses[0].title).toBe('Test Course');
  });

  it('should list courses with fallback when offline', async () => {
    vi.spyOn(likha, 'request').mockRejectedValueOnce(new Error('Network error'));
    const courses = await coursesApi.listCourses();
    expect(Array.isArray(courses)).toBe(true);
    expect(courses.length).toBe(0);
  });
});
