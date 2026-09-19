export const TAB_PATHS: Record<string, string> = {
  dashboard: '/dashboard',
  'create-course': '/courses/new',
  calendar: '/calendar',
  inbox: '/inbox',
  'gabay-rag': '/gabay-rag',
  profile: '/profile',
  history: '/history',
  help: '/help',
  accounts: '/accounts',
  'create-account': '/accounts/new',
  page1: '/page1',
  page2: '/page2',
  page3: '/page3',
};

export function tabToPath(tab: string, activeCourseId?: string | null): string {
  if (tab === 'courses') {
    return activeCourseId ? `/courses/${encodeURIComponent(activeCourseId)}/modules` : '/courses';
  }
  if (tab === 'edit-account') return '/accounts';
  return TAB_PATHS[tab] ?? '/dashboard';
}

export function courseToPath(courseId: string, subTab = 'modules'): string {
  return `/courses/${encodeURIComponent(courseId)}/${encodeURIComponent(subTab)}`;
}

export function pathToTab(pathname: string): { tab: string; courseId?: string; subTab?: string; editUserId?: string } {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return { tab: 'dashboard' };
  const [first, second, third] = parts;
  if (first === 'login') return { tab: 'login' };
  if (first === 'dashboard') return { tab: 'dashboard' };
  if (first === 'calendar') return { tab: 'calendar' };
  if (first === 'inbox') return { tab: 'inbox' };
  if (first === 'gabay-rag') return { tab: 'gabay-rag' };
  if (first === 'profile') return { tab: 'profile' };
  if (first === 'history') return { tab: 'history' };
  if (first === 'help') return { tab: 'help' };
  if (first === 'page1') return { tab: 'page1' };
  if (first === 'page2') return { tab: 'page2' };
  if (first === 'page3') return { tab: 'page3' };
  if (first === 'courses') {
    if (second === 'new') return { tab: 'create-course' };
    if (!second) return { tab: 'courses' };
    return { tab: 'courses', courseId: decodeURIComponent(second), subTab: third ? decodeURIComponent(third) : 'modules' };
  }
  if (first === 'accounts') {
    if (second === 'new') return { tab: 'create-account' };
    if (second && third === 'edit') return { tab: 'edit-account', editUserId: decodeURIComponent(second) };
    return { tab: 'accounts' };
  }
  return { tab: 'dashboard' };
}
