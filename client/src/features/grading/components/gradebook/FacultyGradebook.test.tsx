// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const mocks = vi.hoisted(() => ({
  db: {} as any,
  isLoading: false,
  isSyncing: false,
  setGradesReleased: vi.fn(),
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    db: mocks.db,
    showAlert: vi.fn(),
    effectiveTermsForCourse: () => ['midterm', 'finals'],
    isLoading: mocks.isLoading,
    isSyncing: mocks.isSyncing,
    setGradesReleased: mocks.setGradesReleased,
  }),
}));

import { FacultyGradebook } from './FacultyGradebook';

function baseDb() {
  return {
    courses: [{ id: 'c1', code: 'CMSC 180', section: 'BSCS 4-1', syllabus: null }],
    users: [],
    enrollmentRequests: [],
    activities: [
      { id: 'act1', courseId: 'c1', title: 'MT Activity', published: true, pointsPossible: 100, term: 'midterm', questions: [] },
      { id: 'asg1', courseId: 'c1', title: 'Classic Lab', published: true, pointsPossible: 50, term: 'midterm', format: 'classic', questions: [] },
    ],
    quizzes: [
      { id: 'q1', courseId: 'c1', title: 'MT Quiz', published: true, term: 'midterm', questions: [{ id: 'qq1', points: 20 }] },
    ],
    submissions: [],
    exams: [],
  } as any;
}

describe('FacultyGradebook columns', () => {
  beforeEach(() => {
    mocks.db = baseDb();
    mocks.isLoading = false;
    mocks.isSyncing = false;
    localStorage.setItem('gabay-gradebook-collapsed-c1', JSON.stringify([]));
  });

  test('shows published activities and quizzes as columns', () => {
    render(<FacultyGradebook courseId="c1" />);
    expect(screen.getAllByText('MT Activity').length).toBeGreaterThan(0);
    expect(screen.getAllByText('MT Quiz').length).toBeGreaterThan(0);
  });
});

describe('FacultyGradebook roster', () => {
  beforeEach(() => {
    const db = baseDb();
    db.users = [
      { id: 'u-enrolled', role: 'student', name: 'Enrolled Student', email: 'enrolled@gmail.com', studentId: '2021-SLUC-0001', avatar: '', enrolledCourseIds: ['c1'] },
      { id: 'u-stranger', role: 'student', name: 'Stranger Student', email: 'stranger@gmail.com', studentId: '2021-SLUC-0002', avatar: '' },
      { id: 'u-approved', role: 'student', name: 'Approved Student', email: 'approved@gmail.com', studentId: '2021-SLUC-0003', avatar: '', enrolledCourseIds: [] },
      { id: 'u-other', role: 'student', name: 'Other Course Student', email: 'other@gmail.com', studentId: '2021-SLUC-0004', avatar: '', enrolledCourseIds: ['c2'] },
    ];
    db.enrollmentRequests = [
      { id: 'r1', courseId: 'c1', studentId: 'u-approved', status: 'approved' },
    ];
    mocks.db = db;
    mocks.isLoading = false;
    mocks.isSyncing = false;
    localStorage.setItem('gabay-gradebook-collapsed-c1', JSON.stringify([]));
  });

  test('shows only students enrolled in the course', () => {
    render(<FacultyGradebook courseId="c1" />);
    expect(screen.getByText('Enrolled Student')).toBeInTheDocument();
    expect(screen.getByText('Approved Student')).toBeInTheDocument();
    expect(screen.queryByText('Stranger Student')).not.toBeInTheDocument();
    expect(screen.queryByText('Other Course Student')).not.toBeInTheDocument();
  });

  test('says no currently enrolled students when the roster is empty', () => {
    const db = baseDb();
    db.users = [];
    mocks.db = db;
    render(<FacultyGradebook courseId="c1" />);
    expect(screen.getByText('No currently enrolled students.')).toBeInTheDocument();
    expect(screen.queryByText(/no student records found matching/i)).not.toBeInTheDocument();
  });
});

describe('FacultyGradebook collapse', () => {
  beforeEach(() => {
    mocks.db = baseDb();
    mocks.isLoading = false;
    mocks.isSyncing = false;
    localStorage.removeItem('gabay-gradebook-collapsed-c1');
  });

  test('defaults to all-collapsed on first visit', () => {
    render(<FacultyGradebook courseId="c1" />);
    expect(screen.queryByText('MT Activity')).not.toBeInTheDocument();
    expect(screen.getAllByText(/hidden/).length).toBeGreaterThan(0);
  });

  test('expanding a term reveals its columns with animation class', () => {
    render(<FacultyGradebook courseId="c1" />);
    fireEvent.click(screen.getByRole('button', { name: /expand midterm columns/i }));
    expect(screen.getAllByText('MT Activity').length).toBeGreaterThan(0);
    expect(document.querySelector('.animate-gradebook-cell-in')).not.toBeNull();
  });
});

describe('FacultyGradebook refresh loading', () => {
  beforeEach(() => {
    mocks.db = { ...baseDb(), activities: [], quizzes: [] };
    mocks.isLoading = false;
    mocks.isSyncing = false;
    localStorage.setItem('gabay-gradebook-collapsed-c1', JSON.stringify([]));
  });

  test('shows loading skeleton (not empty text) while bootstrapping', () => {
    mocks.isLoading = true;
    render(<FacultyGradebook courseId="c1" />);
    expect(screen.getByTestId('spr-loading')).toBeInTheDocument();
    expect(screen.queryByText(/no grade columns yet/i)).not.toBeInTheDocument();
  });

  test('shows loading skeleton while background sync fills columns', () => {
    mocks.isSyncing = true;
    render(<FacultyGradebook courseId="c1" />);
    expect(screen.getByTestId('spr-loading')).toBeInTheDocument();
    expect(screen.queryByText(/no grade columns yet/i)).not.toBeInTheDocument();
  });

  test('shows empty state only once loading settles', () => {
    render(<FacultyGradebook courseId="c1" />);
    expect(screen.getAllByText(/no grade columns yet/i).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('spr-loading')).not.toBeInTheDocument();
  });
});

describe('FacultyGradebook grade release', () => {
  beforeEach(() => {
    mocks.setGradesReleased.mockClear();
    mocks.db = { ...baseDb(), courses: [{ ...baseDb().courses[0], gradesReleased: { midterm: true } }] };
    localStorage.setItem('gabay-gradebook-collapsed-c1', JSON.stringify([]));
  });

  test('released term shows pill and Un-release; unreleased shows Release', () => {
    render(<FacultyGradebook courseId="c1" />);
    expect(screen.getByTestId('grades-release-midterm')).toHaveTextContent(/un-release/i);
    expect(screen.getByTestId('grades-release-finals')).toHaveTextContent(/^release$/i);
    expect(screen.getByText('Released')).toBeInTheDocument();
    expect(screen.getByText('Not released')).toBeInTheDocument();
  });

  test('clicking Release calls setGradesReleased with term and true', () => {
    render(<FacultyGradebook courseId="c1" />);
    fireEvent.click(screen.getByTestId('grades-release-finals'));
    expect(mocks.setGradesReleased).toHaveBeenCalledWith('c1', 'finals', true);
  });
});
