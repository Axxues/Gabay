import { describe, it, expect } from 'vitest';
import { authApi } from './auth.api';

describe('authApi', () => {
  it('should expose login, me, and logout methods', () => {
    expect(authApi).toBeDefined();
    expect(typeof authApi.login).toBe('function');
    expect(typeof authApi.me).toBe('function');
    expect(typeof authApi.logout).toBe('function');
  });
});
