// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';

const facultyUser = {
  id: 'u-fac-1',
  name: 'Faculty 1',
  email: 'faculty1@dmmmsu.edu.ph',
  role: 'faculty',
  avatar: '',
  department: 'CS',
  title: 'Instructor',
} as any;

const approvedRow = {
  id: 'req-approved-1',
  courseId: 'c1',
  studentId: 'u-stud-1',
  type: 'self_join',
  status: 'approved',
} as any;

const fetchedPaths: string[] = [];

const apiFetchMock = vi.fn(async (path: string, _options?: any) => {
  fetchedPaths.push(path);
  if (path === '/api/auth/login') return { token: 't', user: { ...facultyUser } };
  if (path === '/api/courses') return { courses: [{ id: 'c1', code: 'CMSC 180', instructorId: 'u-fac-1' }] };
  if (path === '/api/notifications?limit=200') return { notifications: [] };
  if (path === '/api/messages') return { messages: [] };
  if (path === '/api/calendar') return { events: [] };
  if (path === '/api/users') return { users: [{ ...facultyUser }] };
  if (path === '/api/groups') return { groups: [] };
  if (path === '/api/advising') return { slots: [] };
  if (path === '/api/courses/c1/sections') return { sections: [] };
  if (path === '/api/courses/c1/requests?status=pending') return { requests: [] };
  if (path === '/api/courses/c1/requests?status=approved') return { requests: [approvedRow] };
  if (path === '/api/requests/mine') return { requests: [] };
  // Deferred per-course content fills are tolerated as failures; return
  // empties for the known shapes and throw for anything truly unexpected.
  if (path.includes('/modules') || path.includes('/announcements') || path.includes('/discussions')) {
    throw new Error(`unmocked-content: ${path}`);
  }
  if (path.includes('/folders') || path.includes('/files') || path.includes('/quizzes') || path.includes('/exams')) {
    throw new Error(`unmocked-content: ${path}`);
  }
  if (path.includes('/activities') || path.includes('/submissions') || path.includes('/grades') || path.includes('/spr')) {
    throw new Error(`unmocked-content: ${path}`);
  }
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

let doLogin: (() => Promise<any>) | null = null;
let cachedRequests: any[] | null = null;

const Probe = () => {
  const { db, login } = useLMS();
  cachedRequests = db.enrollmentRequests as any[];
  doLogin = () => login('faculty1@dmmmsu.edu.ph', 'pw');
  return null;
};

describe('bootstrap enrollment-request scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchedPaths.length = 0;
    doLogin = null;
    cachedRequests = null;
    try {
      localStorage.clear();
    } catch {}
  });

  test('caches approved requests alongside pending ones (People + gradebook rosters)', async () => {
    render(
      <LMSProvider>
        <Probe />
      </LMSProvider>
    );
    await act(async () => {
      await doLogin!();
    });
    await waitFor(() => {
      expect(fetchedPaths).toContain('/api/courses/c1/requests?status=approved');
    });
    await waitFor(() => {
      expect(cachedRequests).toContainEqual(expect.objectContaining({ id: 'req-approved-1', status: 'approved' }));
    });
  });
});
