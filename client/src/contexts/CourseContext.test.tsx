import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CourseProvider, useCourse } from './CourseContext';

describe('CourseContext', () => {
  it('throws an error if useCourse is called outside CourseProvider', () => {
    expect(() => renderHook(() => useCourse())).toThrow('useCourse must be used within a CourseProvider');
  });

  it('manages active course state', () => {
    const { result } = renderHook(() => useCourse(), {
      wrapper: ({ children }) => <CourseProvider>{children}</CourseProvider>,
    });

    expect(result.current.activeCourseId).toBeNull();
    act(() => {
      result.current.setActiveCourseId('course-101');
    });
    expect(result.current.activeCourseId).toBe('course-101');
  });
});
