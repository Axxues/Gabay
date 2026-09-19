// src/utils/notifiers.test.ts
import { describe, expect, it } from 'vitest';
import {
  countNewFiles,
  countPendingPeople,
  countUnreadAnnouncements,
  countUnreadMessages,
  isNewerThanVisit,
  resolveAnnouncementReplyRecipient,
  resolveModuleReplyRecipient,
} from './notifiers';

describe('reply recipients', () => {
  it('notifies the announcement author on reply', () => {
    expect(
      resolveAnnouncementReplyRecipient({ authorId: 'u-fac' }, { id: 'u-stu' })
    ).toBe('u-fac');
  });
  it('never self-notifies on announcement reply', () => {
    expect(
      resolveAnnouncementReplyRecipient({ authorId: 'u-fac' }, { id: 'u-fac' })
    ).toBeNull();
  });
  it('notifies the module author on comment', () => {
    expect(
      resolveModuleReplyRecipient(
        { authorId: 'u-fac', comments: [] },
        { id: 'u-stu' }
      )
    ).toBe('u-fac');
  });
  it('prefers the most-recent prior commenter over the module author', () => {
    expect(
      resolveModuleReplyRecipient(
        {
          authorId: 'u-fac',
          comments: [
            { authorId: 'u-a' },
            { authorId: 'u-b' },
          ],
        },
        { id: 'u-c' }
      )
    ).toBe('u-b');
  });
  it('never self-notifies on module comment', () => {
    expect(
      resolveModuleReplyRecipient(
        { authorId: 'u-stu', comments: [] },
        { id: 'u-stu' }
      )
    ).toBeNull();
  });
});

describe('badge selectors', () => {
  it('counts only section-visible unread announcements', () => {
    const anns = [
      { id: 'a1', courseId: 'c1', sectionId: 'all', readBy: [] },
      { id: 'a2', courseId: 'c1', sectionId: 'sec-a', readBy: [] },
      { id: 'a3', courseId: 'c1', sectionId: 'sec-a', readBy: ['u-stu'] },
    ];
    expect(
      countUnreadAnnouncements(anns, { id: 'u-stu', role: 'student', sectionId: 'sec-b' }, 'c1')
    ).toBe(1);
  });
  it('counts unread direct messages for the viewer', () => {
    const msgs = [
      { id: 'm1', recipientId: 'u-stu', read: false },
      { id: 'm2', recipientId: 'u-stu', read: true },
      { id: 'm3', recipientId: 'u-other', read: false },
    ];
    expect(countUnreadMessages(msgs, 'u-stu')).toBe(1);
  });
  it('counts pending enrollment requests for faculty', () => {
    const reqs = [
      { courseId: 'c1', status: 'pending' },
      { courseId: 'c1', status: 'approved' },
      { courseId: 'c2', status: 'pending' },
    ];
    expect(countPendingPeople(reqs, 'c1')).toBe(1);
  });
  it('counts files newer than the last files visit', () => {
    const files = [
      { id: 'f1', courseId: 'c1', updatedAt: '2026-09-13T10:00:00.000Z' },
      { id: 'f2', courseId: 'c1', updatedAt: '2026-09-10T10:00:00.000Z' },
    ];
    expect(
      countNewFiles(files, 'c1', { 'files:c1': '2026-09-12T00:00:00.000Z' })
    ).toBe(1);
  });
  it('compares timestamps safely', () => {
    expect(isNewerThanVisit('2026-09-13T00:00:00.000Z', undefined)).toBe(true);
    expect(isNewerThanVisit('2026-09-10T00:00:00.000Z', '2026-09-12T00:00:00.000Z')).toBe(false);
  });
});
