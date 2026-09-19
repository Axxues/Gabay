// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const mocks = vi.hoisted(() => ({
  db: {} as any,
  gradesReleased: {} as any,
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    db: mocks.db,
    activeUser: { id: 'u-stu-1', name: 'Stu Dent' },
    markTabVisited: vi.fn(),
    effectiveTermsForCourse: () => ['midterm', 'finals'],
  }),
}));

import { StudentGradebook } from './StudentGradebook';

function baseDb() {
  return {
    courses: [{
      id: 'c1', code: 'CMSC 131', title: 'T', section: 'S',
      syllabus: { gradingSystem: null },
      gradesReleased: mocks.gradesReleased,
    }],
    users: [],
    activities: [],
    quizzes: [],
    submissions: [],
    exams: [],
  } as any;
}

describe('StudentGradebook release gating', () => {
  beforeEach(() => {
    mocks.gradesReleased = {};
    mocks.db = baseDb();
  });

  test('nothing released → locked empty state, no scores, no simulator', () => {
    mocks.db = baseDb();
    render(<StudentGradebook courseId="c1" />);
    expect(screen.getByText(/still not released/i)).toBeInTheDocument();
    expect(screen.queryByText(/what-if/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/simulator/i)).not.toBeInTheDocument();
  });

  test('partial release → released term visible, unreleased locked, no total', () => {
    mocks.gradesReleased = { midterm: true };
    mocks.db = baseDb();
    render(<StudentGradebook courseId="c1" />);
    expect(screen.getByText(/midterm period grade/i)).toBeInTheDocument();
    expect(screen.getByText(/not released/i)).toBeInTheDocument();
    expect(screen.queryByText(/calculated final course rating/i)).not.toBeInTheDocument();
  });

  test('full release → total and transmuted grade shown', () => {
    mocks.gradesReleased = { midterm: true, finals: true };
    mocks.db = baseDb();
    render(<StudentGradebook courseId="c1" />);
    expect(screen.getByText(/calculated final course rating/i)).toBeInTheDocument();
  });
});
