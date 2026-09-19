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
    activeUser: { id: 'u-fac-1', name: 'Faculty', role: 'faculty' },
    activeRole: 'faculty',
    db: { courses: [{ id: 'c1', code: 'CS 101' }], announcements: [] },
    isLoading: mocks.isLoading,
    isSyncing: mocks.isSyncing,
    deleteAnnouncement: vi.fn(),
    togglePinAnnouncement: vi.fn(),
    toggleLikeAnnouncement: vi.fn(),
    addAnnouncementReply: vi.fn(),
    markAnnouncementRead: vi.fn().mockResolvedValue(undefined),
    showConfirm: vi.fn(),
  }),
}));

import { AnnouncementsView } from './AnnouncementsView';

function renderPage() {
  return render(<AnnouncementsView courseId="c1" />);
}

describe('AnnouncementsView refresh loading', () => {
  beforeEach(() => {
    mocks.isLoading = false;
    mocks.isSyncing = false;
  });

  test('shows loading skeleton (not empty text) while bootstrapping', () => {
    mocks.isLoading = true;
    renderPage();
    expect(screen.getByTestId('announcements-loading')).toBeInTheDocument();
    expect(screen.queryByText(/no announcements found/i)).not.toBeInTheDocument();
  });

  test('shows loading skeleton while background sync fills announcements', () => {
    mocks.isSyncing = true;
    renderPage();
    expect(screen.getByTestId('announcements-loading')).toBeInTheDocument();
  });

  test('shows empty state only once loading settles', () => {
    renderPage();
    expect(screen.getByText(/no announcements found/i)).toBeInTheDocument();
    expect(screen.queryByTestId('announcements-loading')).not.toBeInTheDocument();
  });
});
