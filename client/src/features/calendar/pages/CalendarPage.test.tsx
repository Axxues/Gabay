// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  isLoading: false,
  isSyncing: false,
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    db: { calendarEvents: [], courses: [] },
    activeRole: 'faculty',
    activeCourseId: null,
    isLoading: mocks.isLoading,
    isSyncing: mocks.isSyncing,
    markTabVisited: vi.fn(),
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
    createCalendarEvent: vi.fn(),
    updateCalendarEvent: vi.fn(),
    deleteCalendarEvent: vi.fn(),
  }),
}));

import { CalendarPage } from './CalendarPage';

function renderPage() {
  return render(<CalendarPage />);
}

describe('CalendarPage refresh loading', () => {
  beforeEach(() => {
    mocks.isLoading = false;
    mocks.isSyncing = false;
  });

  test('shows loading skeleton (not empty text) while bootstrapping', () => {
    mocks.isLoading = true;
    renderPage();
    expect(screen.getByTestId('calendar-loading')).toBeInTheDocument();
    expect(screen.queryByText(/no events scheduled for this day/i)).not.toBeInTheDocument();
  });

  test('shows loading skeleton while background sync fills events', () => {
    mocks.isSyncing = true;
    renderPage();
    expect(screen.getByTestId('calendar-loading')).toBeInTheDocument();
  });

  test('shows empty state only once loading settles', () => {
    renderPage();
    expect(screen.getByText(/no events scheduled for this day/i)).toBeInTheDocument();
    expect(screen.queryByTestId('calendar-loading')).not.toBeInTheDocument();
  });
});
