// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  isLoading: false,
  isSyncing: false,
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    activeRole: 'faculty',
    activeUser: { id: 'u-fac-1', name: 'Faculty', role: 'faculty' },
    db: { quizzes: [], submissions: [] },
    isLoading: mocks.isLoading,
    isSyncing: mocks.isSyncing,
    recordQuizSubmission: vi.fn(),
  }),
}));

import { QuizzesView } from './QuizzesView';

function renderPage() {
  return render(
    <QuizzesView
      courseId="c1"
      selectedQuizId={null}
      onSelectQuiz={() => {}}
      onBackToModules={() => {}}
    />
  );
}

describe('QuizzesView refresh loading', () => {
  beforeEach(() => {
    mocks.isLoading = false;
    mocks.isSyncing = false;
  });

  test('shows loading skeleton (not empty text) while bootstrapping', () => {
    mocks.isLoading = true;
    renderPage();
    expect(screen.getByTestId('quizzes-loading')).toBeInTheDocument();
    expect(screen.queryByText(/no quizzes published/i)).not.toBeInTheDocument();
  });

  test('shows loading skeleton while background sync fills quizzes', () => {
    mocks.isSyncing = true;
    renderPage();
    expect(screen.getByTestId('quizzes-loading')).toBeInTheDocument();
  });

  test('shows empty state only once loading settles', () => {
    renderPage();
    expect(screen.getByText(/no quizzes published/i)).toBeInTheDocument();
    expect(screen.queryByTestId('quizzes-loading')).not.toBeInTheDocument();
  });
});
