// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import React from 'react';

const baseUser = {
  id: 'u1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'faculty',
  avatar: 'OLD_AVATAR',
  department: 'CS',
  title: 'Instructor',
} as any;

const seededCourse = {
  id: 'c1',
  code: 'C1',
  title: 'T',
  section: 'S',
  term: 'T',
  instructorId: 'u1',
  instructorName: 'N',
  published: true,
  enrolledCount: 0,
};

const apiFetchMock = vi.fn(async (path: string, _options?: any) => {
  if (path === '/api/auth/login') return { token: 't', user: { ...baseUser } };
  if (path === '/api/courses') return { courses: [{ ...seededCourse }] };
  if (path === '/api/courses/c1/grades-release')
    return { course: { id: 'c1', gradesReleased: JSON.stringify({ midterm: true }) } };
  if (path === '/api/notifications?limit=200') return { notifications: [] };
  if (path === '/api/messages') return { messages: [] };
  if (path === '/api/calendar') return { events: [] };
  if (path === '/api/users') return { users: [{ ...baseUser }] };
  if (path === '/api/groups') return { groups: [] };
  if (path === '/api/advising') return { slots: [] };
  if (path === '/api/requests/mine') return { requests: [] };
  throw new Error(`unmocked: ${path}`);
});

vi.mock('@/services/core/client', () => ({
  ApiError: class ApiError extends Error {
    status = 500;
    code = 'request_failed';
  },
  getToken: () => null,
  setToken: vi.fn(),
  clearToken: vi.fn(),
  apiFetch: (...args: any[]) => (apiFetchMock as any)(...args),
}));

import { LMSProvider, useLMS } from '@/contexts/LMSContext';

let latestCourses: any[] = [];
let doLogin: (() => Promise<any>) | null = null;
let doRelease: (() => Promise<void>) | null = null;

const Probe: React.FC = () => {
  const ctx = useLMS() as any;
  latestCourses = ctx.db.courses;
  doLogin = () => ctx.login('test@example.com', 'pw');
  doRelease = () => ctx.setGradesReleased('c1', 'midterm', true);
  return <div data-testid="probe">{String(latestCourses?.length ?? 0)}</div>;
};

describe('setGradesReleased releases midterm grades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestCourses = [];
    doLogin = null;
    doRelease = null;
    try {
      localStorage.clear();
    } catch {}
  });

  test('course gradesReleased reflects the release after setGradesReleased', async () => {
    render(
      <LMSProvider>
        <Probe />
      </LMSProvider>
    );

    await act(async () => {
      await doLogin!();
    });

    await act(async () => {
      await doRelease!();
    });
    await waitFor(() => {
      expect(latestCourses.find(c => c.id === 'c1')?.gradesReleased).toEqual({ midterm: true });
    });
  });
});
