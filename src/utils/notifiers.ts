// src/utils/notifiers.ts
import { isAnnouncementVisibleToViewer } from './sections';
import type { UserRole } from '@/services/lms/types/lms.types';

interface ReplyAuthor { id: string }
interface AnnLike { authorId: string }
interface ModuleLike {
  authorId?: string;
  comments?: Array<{ authorId: string }>;
}

export function resolveAnnouncementReplyRecipient(
  announcement: AnnLike,
  replier: ReplyAuthor
): string | null {
  if (announcement.authorId === replier.id) return null;
  return announcement.authorId;
}

export function resolveModuleReplyRecipient(
  mod: ModuleLike,
  commenter: ReplyAuthor
): string | null {
  const comments = mod.comments || [];
  for (let i = comments.length - 1; i >= 0; i--) {
    const priorId = comments[i].authorId;
    if (priorId && priorId !== commenter.id) return priorId;
  }
  if (mod.authorId && mod.authorId !== commenter.id) return mod.authorId;
  return null;
}

interface AnnBadgeLike {
  id: string;
  courseId: string;
  sectionId?: string;
  sectionRestriction?: string;
  readBy?: string[];
}

export function countUnreadAnnouncements(
  announcements: AnnBadgeLike[],
  viewer: { id: string; role: UserRole; sectionId: string | null },
  courseId: string
): number {
  return announcements.filter(a => {
    if (a.courseId !== courseId && a.courseId !== 'all') return false;
    const scope = a.sectionId ?? (a.sectionRestriction && a.sectionRestriction !== 'All Sections' ? a.sectionRestriction : 'all');
    if (!isAnnouncementVisibleToViewer({ sectionId: scope }, viewer.sectionId, viewer.role)) return false;
    return !(a.readBy || []).includes(viewer.id);
  }).length;
}

export function countUnreadMessages(
  messages: Array<{ recipientId: string; read: boolean }>,
  viewerId: string
): number {
  return messages.filter(m => m.recipientId === viewerId && !m.read).length;
}

export function countPendingPeople(
  requests: Array<{ courseId: string; status: string }>,
  courseId: string
): number {
  return requests.filter(r => r.courseId === courseId && r.status === 'pending').length;
}

export function isNewerThanVisit(updatedAt: string, lastVisit: string | undefined): boolean {
  if (!lastVisit) return true;
  return new Date(updatedAt).getTime() > new Date(lastVisit).getTime();
}

export function countNewFiles(
  files: Array<{ courseId: string; updatedAt: string }>,
  courseId: string,
  lastVisitedAt: Record<string, string>
): number {
  const visit = lastVisitedAt[`files:${courseId}`];
  return files.filter(f => f.courseId === courseId && isNewerThanVisit(f.updatedAt, visit)).length;
}

export function countNewGrades(
  grades: Array<{ courseId: string; studentId: string; updatedAt?: string }>,
  courseId: string,
  studentId: string,
  lastVisitedAt: Record<string, string>
): number {
  const visit = lastVisitedAt[`grades:${courseId}`];
  return grades.filter(
    g => g.courseId === courseId && g.studentId === studentId && g.updatedAt && isNewerThanVisit(g.updatedAt, visit)
  ).length;
}

export function countUpcomingCalendar(
  events: Array<{ courseId?: string; date: string; createdAt?: string }>,
  courseId: string,
  lastVisitedAt: Record<string, string>
): number {
  const visit = lastVisitedAt[`calendar:${courseId}`];
  const now = new Date();
  const in14d = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  return events.filter(e => {
    if (e.courseId && e.courseId !== courseId) return false;
    const d = new Date(e.date);
    if (isNaN(d.getTime()) || d < now || d > in14d) return false;
    if (e.createdAt && visit) return isNewerThanVisit(e.createdAt, visit);
    if (visit) return false;
    return true;
  }).length;
}

export function countStudentAssessmentBadge(
  publishedIds: string[],
  submittedActivityKeys: string[]
): number {
  const submitted = new Set(submittedActivityKeys);
  return publishedIds.filter(id => !submitted.has(id)).length;
}

export function countFacultyGradingBadge(
  submissions: Array<{ activityKey?: string; status: string }>,
  activityKeys: string[]
): number {
  const wanted = new Set(activityKeys);
  return submissions.filter(s => s.activityKey !== undefined && wanted.has(s.activityKey) && s.status === 'submitted').length;
}
