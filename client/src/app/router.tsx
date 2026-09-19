import { Suspense, useEffect, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, useLocation, useParams } from 'react-router-dom';
import { useLMS } from '@/contexts/LMSContext';
import { Layout, useAppNavigation } from '@/layouts/Layout';
import { AuthLoadingScreen, ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { RequireAdmin } from '@/features/auth/components/RequireAdmin';
import { AppSkeleton } from '@/components/shared/AppSkeleton';
import { lazyWithRetry } from '@/utils/promise';

const Login = lazyWithRetry(() => import('@/features/auth/pages/LoginPage'));
const Dashboard = lazyWithRetry(() => import('@/features/dashboard/pages/DashboardPage'));
const CreateCourse = lazyWithRetry(() => import('@/features/courses/pages/CreateCoursePage'));
const Courses = lazyWithRetry(() => import('@/features/courses/pages/CoursesPage'));
const Calendar = lazyWithRetry(() => import('@/features/calendar/pages/CalendarPage'));
const Inbox = lazyWithRetry(() => import('@/features/inbox/pages/InboxPage'));
const GabayRAG = lazyWithRetry(() => import('@/features/ai-chat/pages/GabayRAGPage'));
const Profile = lazyWithRetry(() => import('@/features/accounts/pages/ProfilePage'));
const History = lazyWithRetry(() => import('@/features/history/pages/HistoryPage'));
const Help = lazyWithRetry(() => import('@/features/help/pages/HelpPage'));
const ManageAccounts = lazyWithRetry(() => import('@/features/accounts/pages/ManageAccountsPage'));
const CreateAccount = lazyWithRetry(() => import('@/features/accounts/pages/CreateAccountPage'));
const EditAccount = lazyWithRetry(() => import('@/features/accounts/pages/EditAccountPage'));

const withSuspense = (element: ReactNode) => (
  <Suspense fallback={<AppSkeleton />}>{element}</Suspense>
);

const LoginRoute: React.FC = () => {
  const { isAuthenticated, isLoading, authReady } = useLMS();
  const location = useLocation();
  const stateFrom = (location.state as { from?: string } | null)?.from;
  const from = (stateFrom && stateFrom !== '/gabay-rag' && stateFrom !== '/login') ? stateFrom : '/dashboard';

  if (!authReady || (isAuthenticated && isLoading)) {
    return <AuthLoadingScreen />;
  }
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }
  return withSuspense(<Login />);
};

const CoursesRoute: React.FC = () => {
  const { courseId, subTab } = useParams<{ courseId?: string; subTab?: string }>();
  const { activeCourseId, setActiveCourseId } = useLMS();

  useEffect(() => {
    if (courseId && courseId !== activeCourseId) {
      setActiveCourseId(decodeURIComponent(courseId));
    }
  }, [courseId, activeCourseId, setActiveCourseId]);

  const effectiveSubTab = subTab ? decodeURIComponent(subTab) : 'modules';
  return withSuspense(<Courses key={`${courseId ?? activeCourseId ?? 'none'}-${effectiveSubTab}`} initialSubTab={effectiveSubTab} />);
};

const EditAccountRoute: React.FC<{ nav: ReturnType<typeof useAppNavigation> }> = ({ nav }) => {
  const { userId } = useParams<{ userId: string }>();
  const { db } = useLMS();
  const decodedId = userId ? decodeURIComponent(userId) : undefined;
  const user = decodedId ? db.users.find(u => u.id === decodedId) : undefined;
  if (!user) {
    return withSuspense(<ManageAccounts onNavigateTab={nav.handleNavigateTab} onEditAccount={nav.handleEditAccount} />);
  }
  return withSuspense(<EditAccount key={user.id} user={user} onNavigateTab={nav.handleNavigateTab} />);
};

// Small wrapper so route elements can share one navigation object without prop drilling.
function RouteWithNav({ element }: { element: (nav: ReturnType<typeof useAppNavigation>) => ReactNode }) {
  const nav = useAppNavigation();
  return <>{element(nav)}</>;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginRoute /> },
  {
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <RouteWithNav element={(nav) => withSuspense(<Dashboard onNavigateCourse={nav.handleNavigateCourse} onNavigateTab={nav.handleNavigateTab} />)} /> },
      { path: '/courses/new', element: <RouteWithNav element={(nav) => withSuspense(<CreateCourse onNavigateCourse={nav.handleNavigateCourse} onNavigateTab={nav.handleNavigateTab} />)} /> },
      { path: '/courses', element: <CoursesRoute /> },
      { path: '/courses/:courseId', element: <CoursesRoute /> },
      { path: '/courses/:courseId/:subTab', element: <CoursesRoute /> },
      { path: '/calendar', element: withSuspense(<Calendar />) },
      { path: '/inbox', element: withSuspense(<Inbox />) },
      { path: '/gabay-rag', element: withSuspense(<GabayRAG />) },
      { path: '/profile', element: <RouteWithNav element={(nav) => withSuspense(<Profile onNavigateTab={nav.handleNavigateTab} />)} /> },
      { path: '/history', element: <RouteWithNav element={(nav) => withSuspense(<History onNavigateCourse={nav.handleNavigateCourse} onNavigateTab={nav.handleNavigateTab} />)} /> },
      { path: '/help', element: <RouteWithNav element={(nav) => withSuspense(<Help onNavigateTab={nav.handleNavigateTab} />)} /> },
      { path: '/accounts', element: <RequireAdmin><RouteWithNav element={(nav) => withSuspense(<ManageAccounts onNavigateTab={nav.handleNavigateTab} onEditAccount={nav.handleEditAccount} />)} /></RequireAdmin> },
      { path: '/accounts/new', element: <RequireAdmin><RouteWithNav element={(nav) => withSuspense(<CreateAccount onNavigateTab={nav.handleNavigateTab} />)} /></RequireAdmin> },
      { path: '/accounts/:userId/edit', element: <RequireAdmin><RouteWithNav element={(nav) => <EditAccountRoute nav={nav} />} /></RequireAdmin> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
