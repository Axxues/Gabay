// @vitest-environment jsdom
// Regression test: route guards gate on `authReady` from useLMS(). When the
// context did not provide it, every protected route rendered the loading
// skeleton forever (undefined is falsy).
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import React from 'react';

const sessionUser = {
  id: 'u9',
  name: 'Session User',
  email: 'session@example.com',
  role: 'faculty',
  avatar: 'a',
  department: 'CS',
  title: 'Instructor',
} as any;

let tokenInStore: string | null = null;

const apiFetchMock = vi.fn(async (path: string, _options?: any) => {
  if (path === '/api/auth/me') return { user: { ...sessionUser } };
  if (path === '/api/courses') return { courses: [] };
  if (path === '/api/notifications?limit=200') return { notifications: [] };
  if (path === '/api/messages') return { messages: [] };
  if (path === '/api/calendar') return { events: [] };
  if (path === '/api/users') return { users: [{ ...sessionUser }] };
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
  getToken: () => tokenInStore,
  setToken: vi.fn(),
  clearToken: vi.fn(() => {
    tokenInStore = null;
  }),
  apiFetch: (...args: any[]) => (apiFetchMock as any)(...args),
}));

import { LMSProvider, useLMS } from '@/contexts/LMSContext';

let seenAuthReady: unknown[] = [];
let seenUserId: unknown = undefined;

const Probe: React.FC = () => {
  const { authReady, currentUser } = useLMS();
  seenAuthReady.push(authReady);
  seenUserId = (currentUser as any)?.id;
  return null;
};

describe('authReady session-restore gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenInStore = null;
    seenAuthReady = [];
    seenUserId = undefined;
    try {
      localStorage.clear();
    } catch {}
  });

  test('resolves true immediately when there is no stored token', async () => {
    render(
      <LMSProvider>
        <Probe />
      </LMSProvider>
    );
    await waitFor(() => {
      expect(seenAuthReady[seenAuthReady.length - 1]).toBe(true);
    });
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  test('resolves true after the token -> /api/auth/me restore settles', async () => {
    tokenInStore = 'stored-token';
    render(
      <LMSProvider>
        <Probe />
      </LMSProvider>
    );
    await waitFor(() => {
      expect(seenAuthReady[seenAuthReady.length - 1]).toBe(true);
    });
    expect(apiFetchMock).toHaveBeenCalledWith('/api/auth/me');
    expect(seenUserId).toBe('u9');
  });

  test('resolves true even when restore fails with a 401', async () => {
    tokenInStore = 'stale-token';
    apiFetchMock.mockRejectedValueOnce(
      Object.assign(new Error('Invalid or expired token.'), { status: 401 })
    );
    render(
      <LMSProvider>
        <Probe />
      </LMSProvider>
    );
    await waitFor(() => {
      expect(seenAuthReady[seenAuthReady.length - 1]).toBe(true);
    });
  });
});
