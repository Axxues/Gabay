import { describe, it, expect } from 'vitest';
import { likha, LIKHA_URL } from './likhaClient';

describe('likhaClient', () => {
  it('should initialize likha client with correct url', () => {
    expect(likha).toBeDefined();
    expect(LIKHA_URL).toContain('gabay.zyberlab.com');
  });

  it('should expose rest and auth capabilities', () => {
    expect(typeof likha.request).toBe('function');
    expect(typeof likha.login).toBe('function');
    expect(typeof likha.logout).toBe('function');
  });
});
