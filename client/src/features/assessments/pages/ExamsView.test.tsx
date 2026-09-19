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
    db: { exams: [], submissions: [] },
    isLoading: mocks.isLoading,
    isSyncing: mocks.isSyncing,
    recordExamSubmission: vi.fn(),
  }),
}));

import { ExamsView } from './ExamsView';

function renderPage() {
  return render(
    <ExamsView
      courseId="c1"
      selectedExamId={null}
      onSelectExam={() => {}}
      onBackToModules={() => {}}
    />
  );
}

describe('ExamsView refresh loading', () => {
  beforeEach(() => {
    mocks.isLoading = false;
    mocks.isSyncing = false;
  });

  test('shows loading skeleton (not empty text) while bootstrapping', () => {
    mocks.isLoading = true;
    renderPage();
    expect(screen.getByTestId('exams-loading')).toBeInTheDocument();
    expect(screen.queryByText(/no exams published/i)).not.toBeInTheDocument();
  });

  test('shows loading skeleton while background sync fills exams', () => {
    mocks.isSyncing = true;
    renderPage();
    expect(screen.getByTestId('exams-loading')).toBeInTheDocument();
  });

  test('shows empty state only once loading settles', () => {
    renderPage();
    expect(screen.getByText(/no exams published/i)).toBeInTheDocument();
    expect(screen.queryByTestId('exams-loading')).not.toBeInTheDocument();
  });
});
