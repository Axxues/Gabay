// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';

const NEW_AVATAR = '/uploads/999_new-photo.png';

const baseUser = {
  id: 'u1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'faculty',
  avatar: 'OLD_AVATAR',
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
  if (path === `/api/users/${baseUser.id}`) return { user: { ...baseUser, avatar: NEW_AVATAR } };
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

let latestAvatar: string | null | undefined;
let doLogin: (() => Promise<any>) | null = null;
let doUpdate: (() => Promise<boolean>) | null = null;

const Probe: React.FC = () => {
  const { activeUser, login, updateUser } = useLMS();
  latestAvatar = (activeUser as any)?.avatar;
  doLogin = () => login('test@example.com', 'pw');
  doUpdate = () => updateUser(baseUser.id, { avatar: NEW_AVATAR });
  return <div data-testid="avatar">{String(latestAvatar)}</div>;
};

describe('updateUser syncs the active session user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestAvatar = undefined;
    doLogin = null;
    doUpdate = null;
    try {
      localStorage.clear();
    } catch {}
  });

  test('activeUser.avatar reflects the new photo without a page reload', async () => {
    render(
      <LMSProvider>
        <Probe />
      </LMSProvider>
    );

    await act(async () => {
      await doLogin!();
    });
    expect(latestAvatar).toBe('OLD_AVATAR');

    await act(async () => {
      await doUpdate!();
    });

    await waitFor(() => {
      expect(latestAvatar).toBe(NEW_AVATAR);
    });
    expect(screen.getByTestId('avatar').textContent).toBe(NEW_AVATAR);
  });
});
