import { describe, expect, it } from 'vitest';
import { canPickSection, getDisplaySectionName, isAnnouncementVisibleToViewer, transitionRequestStatus } from './sections';

describe('sections rules', () => {
  it('shows All-sections announcements to everyone', () => {
    expect(isAnnouncementVisibleToViewer({ sectionId: 'all' }, 'sec-a', 'student')).toBe(true);
  });
  it('hides other-section announcements from students', () => {
    expect(isAnnouncementVisibleToViewer({ sectionId: 'sec-a' }, 'sec-b', 'student')).toBe(false);
  });
  it('shows everything to faculty', () => {
    expect(isAnnouncementVisibleToViewer({ sectionId: 'sec-a' }, null, 'faculty')).toBe(true);
  });
  it('blocks full sections', () => {
    expect(canPickSection({ enrolledCount: 30, capacity: 30 })).toBe(false);
    expect(canPickSection({ enrolledCount: 29, capacity: 30 })).toBe(true);
    expect(canPickSection({ enrolledCount: 0 })).toBe(true);
  });
  it('transitions pending requests', () => {
    expect(transitionRequestStatus('pending', 'approve')).toBe('approved');
    expect(transitionRequestStatus('pending', 'reject')).toBe('rejected');
  });
  it('prefers the single course section name for display', () => {
    expect(
      getDisplaySectionName({ section: 'BSCS 4-1' }, [{ name: 'BSCS 4-A' }])
    ).toBe('BSCS 4-A');
  });
  it('falls back to course.section when no sections exist', () => {
    expect(getDisplaySectionName({ section: 'BSCS 4-1' }, [])).toBe('BSCS 4-1');
  });
  it('falls back when the section name is blank', () => {
    expect(getDisplaySectionName({ section: 'BSCS 4-1' }, [{ name: '  ' }])).toBe(
      'BSCS 4-1'
    );
  });
});
