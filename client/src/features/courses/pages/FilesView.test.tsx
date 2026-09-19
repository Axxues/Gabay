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
    activeRole: 'faculty',
    activeUser: { id: 'u-fac-1', name: 'Faculty', role: 'faculty' },
    db: {
      courses: [],
      courseFolders: [],
      courseFiles: [],
      modules: [],
      announcements: [],
      activities: [],
      quizzes: [],
      users: [],
    },
    isLoading: mocks.isLoading,
    isSyncing: mocks.isSyncing,
    createCourseFolder: vi.fn(),
    uploadCourseFile: vi.fn(),
    deleteCourseFile: vi.fn(),
    deleteCourseFolder: vi.fn(),
    renameCourseFile: vi.fn(),
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
    markTabVisited: vi.fn(),
  }),
}));

import { FilesView } from './FilesView';

function renderPage() {
  return render(<FilesView />);
}

describe('FilesView refresh loading', () => {
  beforeEach(() => {
    mocks.isLoading = false;
    mocks.isSyncing = false;
  });

  test('shows loading skeleton (not empty text) while bootstrapping', () => {
    mocks.isLoading = true;
    renderPage();
    expect(screen.getByTestId('files-loading')).toBeInTheDocument();
    expect(screen.queryByText(/this folder is currently empty/i)).not.toBeInTheDocument();
  });

  test('shows loading skeleton while background sync fills files', () => {
    mocks.isSyncing = true;
    renderPage();
    expect(screen.getByTestId('files-loading')).toBeInTheDocument();
  });

  test('shows empty state only once loading settles', () => {
    renderPage();
    expect(screen.getByText(/this folder is currently empty/i)).toBeInTheDocument();
    expect(screen.queryByTestId('files-loading')).not.toBeInTheDocument();
  });
});
