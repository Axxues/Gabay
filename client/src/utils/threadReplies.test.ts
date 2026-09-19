// client/src/utils/threadReplies.test.ts
import { describe, expect, it } from 'vitest';
import { groupRepliesByRoot, resolveRootId, resolveSecondLayerRecipients } from './threadReplies';

describe('threadReplies', () => {
  it('resolves nested parent chain to the top root', () => {
    const byId = new Map([
      ['c1', { id: 'c1', authorId: 'u-a' }],
      ['c2', { id: 'c2', parentId: 'c1', authorId: 'u-b' }],
      ['c3', { id: 'c3', parentId: 'c2', authorId: 'u-c' }],
    ]);
    expect(resolveRootId({ id: 'c3', parentId: 'c2', authorId: 'u-c' }, byId)).toBe('c1');
  });
  it('treats missing parent as its own root', () => {
    expect(resolveRootId({ id: 'x', parentId: 'ghost', authorId: 'u-a' }, new Map())).toBe('x');
  });
  it('groups descendants under roots in chronological order', () => {
    const rows = [
      { id: 'c1', authorId: 'u-a', createdAt: '2026-09-14T10:00:00Z' },
      { id: 'c2', parentId: 'c1', authorId: 'u-b', createdAt: '2026-09-14T10:01:00Z' },
      { id: 'c3', parentId: 'c2', authorId: 'u-c', createdAt: '2026-09-14T10:02:00Z' },
    ];
    const groups = groupRepliesByRoot(rows);
    expect(groups.get('c1')?.map(r => r.id)).toEqual(['c2', 'c3']);
  });
  it('repro: direct reply is grouped under its top-level root (reported: reply invisible)', () => {
    // Mirrors the reporter's thread: top-level "hello" (c1) + 1 reply (c2).
    // Callers must pass the FULL list (parents included) so roots resolve.
    const all = [
      { id: 'c1', authorId: 'u-faculty', createdAt: '2026-09-16T09:19:00Z' },
      { id: 'c2', parentId: 'c1', authorId: 'u-student', createdAt: '2026-09-16T09:20:00Z' },
    ];
    const groups = groupRepliesByRoot(all);
    expect(groups.get('c1')?.map(r => r.id)).toEqual(['c2']);
  });
  it('notifies parent + root, skipping self and deduping', () => {
    expect(
      resolveSecondLayerRecipients({
        actorId: 'u-c',
        parent: { id: 'c2', authorId: 'u-b' },
        root: { id: 'c1', authorId: 'u-b' },
      })
    ).toEqual(['u-b']);
    expect(
      resolveSecondLayerRecipients({
        actorId: 'u-c',
        parent: { id: 'c2', authorId: 'u-b' },
        root: { id: 'c1', authorId: 'u-a' },
      })
    ).toEqual(['u-b', 'u-a']);
  });
  it('never notifies the actor', () => {
    expect(
      resolveSecondLayerRecipients({
        actorId: 'u-a',
        parent: { id: 'c2', authorId: 'u-b' },
        root: { id: 'c1', authorId: 'u-a' },
      })
    ).toEqual(['u-b']);
  });
});
