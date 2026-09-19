// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const mocks = vi.hoisted(() => ({
  isLoading: false,
  isSyncing: false,
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    db: { courses: [{ id: 'c1', code: 'CS 101' }], enrollmentRequests: [] },
    isLoading: mocks.isLoading,
    isSyncing: mocks.isSyncing,
    approveEnrollmentRequests: vi.fn(),
    rejectEnrollmentRequests: vi.fn(),
    showAlert: vi.fn(),
  }),
}));

import { PendingRequestsPage } from './PendingRequestsPage';

function renderPage() {
  return render(<PendingRequestsPage courseId="c1" />);
}

describe('PendingRequestsPage refresh loading', () => {
  beforeEach(() => {
    mocks.isLoading = false;
    mocks.isSyncing = false;
  });

  test('shows loading skeleton (not empty text) while bootstrapping', () => {
    mocks.isLoading = true;
    renderPage();
    expect(screen.getByTestId('pending-requests-loading')).toBeInTheDocument();
    expect(screen.queryByText(/no pending requests/i)).not.toBeInTheDocument();
  });

  test('shows loading skeleton while background sync fills requests', () => {
    mocks.isSyncing = true;
    renderPage();
    expect(screen.getByTestId('pending-requests-loading')).toBeInTheDocument();
  });

  test('shows empty state only once loading settles', () => {
    renderPage();
    expect(screen.getByText(/no pending requests/i)).toBeInTheDocument();
    expect(screen.queryByTestId('pending-requests-loading')).not.toBeInTheDocument();
  });
});
