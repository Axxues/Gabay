// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const mocks = vi.hoisted(() => ({
  isLoading: false,
  isSyncing: false,
  db: { activities: [], quizzes: [], modules: [], submissions: [] } as any,
  effectiveTerms: ['midterm', 'finals'] as string[],
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    activeRole: 'faculty',
    activeUser: { id: 'u-fac-1', name: 'Faculty', role: 'faculty' },
    db: mocks.db,
    effectiveTermsForCourse: () => mocks.effectiveTerms,
    isLoading: mocks.isLoading,
    isSyncing: mocks.isSyncing,
    submitActivity: vi.fn(),
    deleteActivity: vi.fn(),
    openSpeedGrader: vi.fn(),
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
    recordQuizSubmission: vi.fn(),
  }),
}));

import { ActivitiesView } from './ActivitiesView';
import { QuizzesView } from './QuizzesView';

function renderActivities() {
  return render(
    <ActivitiesView courseId="c1" selectedActivityId={null} onSelectActivity={() => {}} />
  );
}

function renderQuizzes() {
  return render(<QuizzesView courseId="c1" selectedQuizId={null} onSelectQuiz={() => {}} />);
}

describe('Source filter RED', () => {
  beforeEach(() => {
    mocks.isLoading = false;
    mocks.isSyncing = false;
    mocks.db = { activities: [], quizzes: [], modules: [], submissions: [] } as any;
    mocks.effectiveTerms = ['midterm', 'finals'];
  });

  test('shows a source filter on the Activities list', () => {
    renderActivities();
    expect(screen.getByRole('button', { name: /filter by source/i })).toBeInTheDocument();
  });

  test('filters module vs direct activities', () => {
    mocks.db = {
      activities: [
        {
          id: 'asg-direct',
          courseId: 'c1',
          title: 'Direct Lab',
          instructions: '',
          term: 'midterm',
          format: 'classic',
          pointsPossible: 100,
          dueDate: new Date().toISOString(),
          submissionTypes: ['online_text'],
          published: true,
          category: 'Activities',
          weight: 20,
          rubric: [],
        },
        {
          id: 'asg-mod',
          courseId: 'c1',
          title: 'Module Lab',
          instructions: '',
          term: 'midterm',
          format: 'classic',
          pointsPossible: 100,
          dueDate: new Date().toISOString(),
          submissionTypes: ['online_text'],
          published: true,
          category: 'Activities',
          weight: 20,
          rubric: [],
        },
      ],
      quizzes: [],
      modules: [
        {
          id: 'm1',
          courseId: 'c1',
          title: 'Module 1',
          order: 1,
          published: true,
          items: [
            {
              id: 'mi1',
              title: 'Module Lab',
              type: 'activity',
              published: true,
              required: false,
              activityId: 'asg-mod',
            },
          ],
        },
      ],
      submissions: [],
    } as any;
    renderActivities();
    expect(screen.getByText('Direct Lab')).toBeInTheDocument();
    expect(screen.getByText('Module Lab')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /filter by source/i }));
    fireEvent.click(screen.getByRole('option', { name: 'From Module' }));

    expect(screen.queryByText('Direct Lab')).not.toBeInTheDocument();
    expect(screen.getByText('Module Lab')).toBeInTheDocument();
  });

  test('shows a source filter on the Quizzes list', () => {
    renderQuizzes();
    expect(screen.getByRole('button', { name: /filter by source/i })).toBeInTheDocument();
  });
});
