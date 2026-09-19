// src/services/core/client.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApiError, apiFetch, setToken } from '@/services/core/client';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    // Node test env has no DOM localStorage; the token helpers need a stub.
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => { store.clear(); },
    });
  });
  it('attaches the bearer token', async () => {
    setToken('tok-123');
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ a: 1 }) }));
    vi.stubGlobal('fetch', fetchMock);
    await apiFetch('/api/x');
    const calls = fetchMock.mock.calls as Array<Array<{ headers?: Record<string, string> }>>;
    expect(calls[0]?.[1]?.headers?.Authorization).toBe('Bearer tok-123');
  });
  it('throws ApiError with the server envelope', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 401,
      json: async () => ({ error: { code: 'unauthorized', message: 'Nope.' } }),
    })));
    const err = await apiFetch('/api/x').catch(e => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('unauthorized');
  });
  it('throws request_failed on non-JSON errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => { throw new Error('bad'); } })));
    const err = await apiFetch('/api/x').catch(e => e);
    expect((err as ApiError).code).toBe('request_failed');
  });
});
