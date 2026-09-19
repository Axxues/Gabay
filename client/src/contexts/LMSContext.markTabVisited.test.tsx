// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';

const baseUser = {
  id: 'u1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'faculty',
  avatar: '',
  department: 'CS',
  title: 'Instructor',
} as any;

const apiFetchMock = vi.fn(async (path: string, _options?: any) => {
  if (path === '/api/auth/login') return { token: 't', user: { ...baseUser } };
  if (path === '/api/courses') return { courses: [] };
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

let latestVisits: Record<string, string> | undefined;
let doLogin: (() => Promise<any>) | null = null;
let doVisit: ((tab: string, courseId?: string) => void) | null = null;

const Probe = () => {
  const { activeUser, login, markTabVisited } = useLMS();
  latestVisits = (activeUser as any)?.lastVisitedAt;
  doLogin = () => login('test@example.com', 'pw');
  doVisit = (tab: string, courseId?: string) => markTabVisited(tab, courseId);
  return <div data-testid="visits">{JSON.stringify(latestVisits || {})}</div>;
};

describe('markTabVisited syncs the active session user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestVisits = undefined;
    doLogin = null;
    doVisit = null;
    try {
      localStorage.clear();
    } catch {}
  });

  test('viewing the Files tab stamps files:<courseId> without a page reload', async () => {
    render(
      <LMSProvider>
        <Probe />
      </LMSProvider>
    );

    await act(async () => {
      await doLogin!();
    });
    expect(latestVisits?.['files:c1']).toBeUndefined();

    act(() => {
      doVisit!('files', 'c1');
    });

    await waitFor(() => {
      expect(latestVisits?.['files:c1']).toBeDefined();
    });
    expect(typeof latestVisits?.['files:c1']).toBe('string');
  });
});
