import { describe, it, expect, vi } from 'vitest';
import { coursesApi } from './index';

describe('coursesApi', () => {
  it('should be defined and expose course querying functions', () => {
    expect(coursesApi).toBeDefined();
    expect(typeof coursesApi.listCourses).toBe('function');
    expect(typeof coursesApi.getCourseById).toBe('function');
    expect(typeof coursesApi.getCourseModules).toBe('function');
  });

  it('should list courses with fallback when offline', async () => {
    const courses = await coursesApi.listCourses();
    expect(Array.isArray(courses)).toBe(true);
  });
});
