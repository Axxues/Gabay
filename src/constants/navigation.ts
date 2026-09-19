import type { UserRole } from '@/services/lms/types/lms.types';
export type NavIcon = 'dashboard'|'courses'|'calendar'|'inbox'|'history'|'help'|'modules'|'syllabus'|'announcements'|'activities'|'quizzes'|'exams'|'files'|'grades'|'people'|'accounts'|'page1'|'page2'|'page3'|'pending-requests'|'gabay-rag';
export interface NavItem { id: string; label: string; icon: NavIcon; roles: UserRole[] }
const ALL: UserRole[] = ['admin','faculty','student','staff'];
const NO_STAFF: UserRole[] = ['admin','faculty','student'];
export const MAIN_NAV: NavItem[] = [
  { id: 'lms', label: 'Learning Management', icon: 'courses', roles: ALL },
  { id: 'gabay-rag', label: 'Gabay RAG', icon: 'gabay-rag', roles: ALL },
  { id: 'page1', label: 'Page 1', icon: 'page1', roles: NO_STAFF },
  { id: 'page2', label: 'Page 2', icon: 'page2', roles: NO_STAFF },
  { id: 'page3', label: 'Page 3', icon: 'page3', roles: NO_STAFF },
  { id: 'accounts', label: 'Manage College Accounts', icon: 'accounts', roles: ['admin'] },
];
export const LMS_CHILDREN: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', roles: NO_STAFF },
  { id: 'courses', label: 'Courses', icon: 'courses', roles: NO_STAFF },
  { id: 'calendar', label: 'Calendar', icon: 'calendar', roles: ALL },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', roles: ALL },
];
export const COURSE_CHILDREN: NavItem[] = [
  { id: 'modules', label: 'Modules', icon: 'modules', roles: ALL },
  { id: 'syllabus', label: 'Syllabus', icon: 'syllabus', roles: ALL },
  { id: 'announcements', label: 'Announcements', icon: 'announcements', roles: ALL },
  { id: 'activities', label: 'Activities', icon: 'activities', roles: ALL },
  { id: 'quizzes', label: 'Quizzes', icon: 'quizzes', roles: ALL },
  { id: 'exams', label: 'Exams', icon: 'exams', roles: ALL },
  { id: 'files', label: 'Files', icon: 'files', roles: ALL },
  { id: 'grades', label: 'Grades', icon: 'grades', roles: ALL },
  { id: 'people', label: 'People', icon: 'people', roles: NO_STAFF },
];
export function isVisible(item: NavItem, role: UserRole): boolean { return item.roles.includes(role); }

// Top-level tabs that live outside the Learning Management section
// (derived from MAIN_NAV so new top-level pages are excluded automatically).
const NON_LMS_TOP_LEVEL_TABS: string[] = MAIN_NAV.filter(i => i.id !== 'lms').map(i => i.id);
// Standalone authoring pages that should render full-width without the LMS context panel.
const FULL_WIDTH_TABS: string[] = ['create-account', 'edit-account'];
export function isLmsSectionTab(tab: string): boolean { return !NON_LMS_TOP_LEVEL_TABS.includes(tab) && !FULL_WIDTH_TABS.includes(tab); }
