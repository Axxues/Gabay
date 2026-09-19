// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  isLoading: false,
  isSyncing: false,
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    db: { historyLogs: [] },
    isLoading: mocks.isLoading,
    isSyncing: mocks.isSyncing,
    clearHistory: vi.fn(),
    setActiveCourseId: vi.fn(),
    showConfirm: vi.fn(),
  }),
}));

import { HistoryPage } from './HistoryPage';

function renderPage() {
  return render(<HistoryPage onNavigateCourse={() => {}} onNavigateTab={() => {}} />);
}

describe('HistoryPage refresh loading', () => {
  beforeEach(() => {
    mocks.isLoading = false;
    mocks.isSyncing = false;
  });

  test('shows loading skeleton (not empty text) while bootstrapping', () => {
    mocks.isLoading = true;
    renderPage();
    expect(screen.getByTestId('history-loading')).toBeInTheDocument();
    expect(screen.queryByText(/no navigation records found/i)).not.toBeInTheDocument();
  });

  test('shows loading skeleton while background sync runs', () => {
    mocks.isSyncing = true;
    renderPage();
    expect(screen.getByTestId('history-loading')).toBeInTheDocument();
  });

  test('shows empty state only once loading settles', () => {
    renderPage();
    expect(screen.getByText(/no navigation records found/i)).toBeInTheDocument();
    expect(screen.queryByTestId('history-loading')).not.toBeInTheDocument();
  });
});
