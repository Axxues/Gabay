// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const mocks = vi.hoisted(() => ({
  db: { activities: [], submissions: [] } as any,
  onSelectActivity: vi.fn(),
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    activeRole: 'student',
    activeUser: { id: 'u-stu-1', name: 'Student', role: 'student' },
    db: mocks.db,
    recordActivitySubmission: vi.fn(),
    deleteActivity: vi.fn(),
    openSpeedGrader: vi.fn(),
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
  }),
}));

import { ActivityRunnerView } from './ActivityRunnerView';

const questionSet = {
  id: 'act-1',
  courseId: 'c1',
  title: 'Midterm Question Set',
  instructions: 'Answer all questions carefully.',
  term: 'midterm',
  format: 'questionset',
  questions: [
    {
      id: 'q1',
      text: 'What is 2 + 2?',
      type: 'multiple_choice',
      options: ['3', '4'],
      correctAnswer: '4',
      points: 5,
    },
  ],
  pointsPossible: 5,
  published: true,
};

function renderRunner(activityId: string | null) {
  return render(
    <ActivityRunnerView
      courseId="c1"
      activityId={activityId}
      onSelectActivity={mocks.onSelectActivity}
    />
  );
}

describe('ActivityRunnerView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db = { activities: [questionSet], submissions: [] } as any;
  });

  test('renders the selected question set with its questions', () => {
    renderRunner('act-1');
    expect(screen.getByText('Midterm Question Set')).toBeInTheDocument();
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit activity answers/i })).toBeInTheDocument();
  });

  test('back button returns to the activities list', () => {
    renderRunner('act-1');
    fireEvent.click(screen.getByRole('button', { name: /back to activities list/i }));
    expect(mocks.onSelectActivity).toHaveBeenCalledWith(null);
  });

  test('shows an empty state when the question set no longer exists', () => {
    renderRunner('act-missing');
    expect(screen.getByText(/no longer exists/i)).toBeInTheDocument();
  });

  test('prompts to pick a question set when none is selected', () => {
    renderRunner(null);
    expect(screen.getByText(/select a question set/i)).toBeInTheDocument();
  });
});
