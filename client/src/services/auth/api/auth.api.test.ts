import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from './auth.api';
import { likha } from '@/services/core/likhaClient';

describe('authApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should expose login, me, and logout methods', () => {
    expect(authApi).toBeDefined();
    expect(typeof authApi.login).toBe('function');
    expect(typeof authApi.me).toBe('function');
    expect(typeof authApi.logout).toBe('function');
  });

  it('login rejects and propagates error for unregistered @dmmmsu.edu.ph email', async () => {
    vi.spyOn(likha, 'login' as any).mockRejectedValue(new Error('Invalid user credentials.'));

    await expect(
      authApi.login({ email: 'unregistered@dmmmsu.edu.ph', password: 'wrongpassword' })
    ).rejects.toThrow('Invalid user credentials.');
  });

  it('me rejects and does not return a fake local student when unauthenticated', async () => {
    vi.spyOn(likha, 'request').mockRejectedValue(new Error('Unauthorized'));

    await expect(authApi.me()).rejects.toThrow('Unauthorized');
  });
});
