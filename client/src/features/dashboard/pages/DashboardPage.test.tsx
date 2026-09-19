// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  isLoading: false,
  activeRole: 'faculty',
  activeUser: { id: 'u-fac-1', name: 'Faculty', role: 'faculty' } as any,
  pendingRequests: [] as any[],
  db: {
    courses: [],
    enrollmentRequests: [],
    users: [],
    submissions: [],
    activities: [],
    quizzes: [],
    modules: [],
  } as any,
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    activeRole: mocks.activeRole,
    activeUser: mocks.activeUser,
    db: mocks.db,
    isLoading: mocks.isLoading,
    openSpeedGrader: vi.fn(),
    getPendingRequestsForStudent: () => mocks.pendingRequests,
    studentApproveInvitation: vi.fn(),
    studentDeclineInvitation: vi.fn(),
    deleteCourse: vi.fn(),
    showConfirm: vi.fn(),
    showAlert: vi.fn(),
    getApprovedRequestsForCourse: vi.fn().mockResolvedValue([]),
  }),
}));

import { DashboardPage } from './DashboardPage';

function renderPage() {
  return render(
    <DashboardPage onNavigateCourse={() => {}} onNavigateTab={() => {}} />
  );
}

describe('DashboardPage refresh loading', () => {
  beforeEach(() => {
    mocks.isLoading = false;
  });

  test('shows loading skeleton (not "no courses") while bootstrapping', () => {
    mocks.isLoading = true;
    renderPage();
    expect(screen.getByTestId('dashboard-courses-loading')).toBeInTheDocument();
    expect(screen.queryByText(/no enrolled courses/i)).not.toBeInTheDocument();
  });

  test('shows empty state only once loading settles', () => {
    renderPage();
    expect(screen.getByText(/no enrolled courses/i)).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-courses-loading')).not.toBeInTheDocument();
  });
});

describe('DashboardPage pending requests', () => {
  beforeEach(() => {
    mocks.isLoading = false;
    mocks.activeRole = 'student';
    mocks.activeUser = { id: 'u-stud-1', name: 'Student 1', role: 'student' } as any;
    // Target course is NOT in the cached (enrolled-only) course list.
    mocks.db = {
      courses: [],
      enrollmentRequests: [],
      users: [],
      submissions: [],
      activities: [],
      quizzes: [],
      modules: [],
    } as any;
    mocks.pendingRequests = [
      {
        id: 'req-pending-1',
        courseId: 'c-unknown',
        studentId: 'u-stud-1',
        type: 'self_join',
        status: 'pending',
        courseCode: 'CMSC 180',
        courseTitle: 'Artificial Intelligence & Expert Systems',
      },
    ];
  });

  test('shows the course snapshot when the course is not cached', () => {
    renderPage();
    expect(screen.getByText('CMSC 180 — Artificial Intelligence & Expert Systems')).toBeInTheDocument();
  });

  test('never renders a bare dash for an unresolvable course', () => {
    mocks.pendingRequests = [
      {
        id: 'req-pending-2',
        courseId: 'c-gone',
        studentId: 'u-stud-1',
        type: 'self_join',
        status: 'pending',
        courseCode: null,
        courseTitle: null,
      },
    ];
    renderPage();
    expect(screen.getByText('Pending course request')).toBeInTheDocument();
  });
});
