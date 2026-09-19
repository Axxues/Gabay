import { describe, expect, it } from 'vitest';
import { settledValue } from './promise.js';

describe('settledValue', () => {
  it('returns the value of fulfilled results', async () => {
    const r = await Promise.allSettled([Promise.resolve(42)]);
    expect(settledValue(r[0], 0)).toBe(42);
  });
  it('returns the fallback for rejected results', async () => {
    const r = await Promise.allSettled([Promise.reject(new Error('boom'))]);
    expect(settledValue(r[0], 'fallback')).toBe('fallback');
  });
});
