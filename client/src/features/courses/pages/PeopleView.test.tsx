// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  removeStudentFromCourse: vi.fn(),
  showConfirm: vi.fn(),
  showAlert: vi.fn(),
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    db: {
      courses: [{ id: 'c1', code: 'CMSC 131', instructorId: 'u-fac-1' }],
      users: [
        { id: 'u-fac-1', name: 'Prof', email: 'prof@school.edu', role: 'faculty', avatar: '', department: 'CS', title: 'Prof' },
        { id: 'u-stu-1', name: 'Stu One', email: 'stu@school.edu', role: 'student', avatar: '', department: 'CS', title: '', studentId: '2021-00001', enrolledCourseIds: ['c1'] },
      ],
      enrollmentRequests: [
        { id: 'req-1', courseId: 'c1', studentId: 'u-stu-1', studentName: 'Stu One', type: 'self_join', status: 'approved', requestedAt: new Date().toISOString() },
      ],
    },
    activeRole: 'faculty',
    activeUser: { id: 'u-fac-1', name: 'Prof', role: 'faculty' },
    isLoading: false,
    enrollStudentsInCourse: vi.fn(),
    regenerateCourseJoinCode: vi.fn(),
    getPendingRequestsForCourse: vi.fn().mockResolvedValue([]),
    approveEnrollmentRequests: vi.fn(),
    rejectEnrollmentRequests: vi.fn(),
    removeStudentFromCourse: mocks.removeStudentFromCourse,
    showAlert: mocks.showAlert,
    showConfirm: mocks.showConfirm,
  }),
}));

import { PeopleView } from './PeopleView';

function renderPage() {
  return render(<PeopleView courseId="c1" />);
}

describe('PeopleView remove student', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.showConfirm.mockImplementation((_msg: string, cb: () => void) => cb());
    mocks.removeStudentFromCourse.mockResolvedValue(true);
  });

  test('faculty sees a remove control on student roster rows only', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /remove stu one from course/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove prof from course/i })).not.toBeInTheDocument();
  });

  test('confirming removal calls removeStudentFromCourse with the course and student', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /remove stu one from course/i }));
    expect(mocks.showConfirm).toHaveBeenCalledTimes(1);
    expect(mocks.removeStudentFromCourse).toHaveBeenCalledWith('c1', 'u-stu-1');
  });
});
