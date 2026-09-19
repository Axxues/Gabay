import type { UserRole } from '@/services/lms/types/lms.types';

export function isAnnouncementVisibleToViewer(
  ann: { sectionId?: string },
  viewerSectionId: string | null,
  viewerRole: UserRole
): boolean {
  if (viewerRole === 'faculty' || viewerRole === 'admin') return true;
  const scope = ann.sectionId || 'all';
  if (scope === 'all') return true;
  return viewerSectionId === scope;
}

export function canPickSection(section: { enrolledCount: number; capacity?: number }): boolean {
  if (section.capacity === undefined) return true;
  return section.enrolledCount < section.capacity;
}

export function transitionRequestStatus(
  from: 'pending' | 'approved' | 'rejected',
  action: 'approve' | 'reject'
): 'approved' | 'rejected' {
  if (from !== 'pending') throw new Error(`Cannot ${action} a ${from} request`);
  return action === 'approve' ? 'approved' : 'rejected';
}

export function getDisplaySectionName(
  course: { section?: string },
  courseSections: Array<{ name?: string }> | undefined
): string {
  const sectionName = (courseSections?.[0]?.name || '').trim();
  if (sectionName) return sectionName;
  return (course.section || '').trim();
}
