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
    db: { messages: [], chatGroups: [], users: [] },
    isLoading: mocks.isLoading,
    isSyncing: mocks.isSyncing,
    sendMessage: vi.fn(),
    createChatGroup: vi.fn(),
    markThreadAsRead: vi.fn(),
    toggleMessageReaction: vi.fn(),
    showAlert: vi.fn(),
  }),
}));

import { InboxPage } from './InboxPage';

function renderPage() {
  return render(<InboxPage />);
}

describe('InboxPage refresh loading', () => {
  beforeEach(() => {
    mocks.isLoading = false;
    mocks.isSyncing = false;
  });

  test('shows loading skeleton (not empty text) while bootstrapping', () => {
    mocks.isLoading = true;
    renderPage();
    expect(screen.getByTestId('inbox-loading')).toBeInTheDocument();
    expect(screen.queryByText('No conversations found')).not.toBeInTheDocument();
  });

  test('shows loading skeleton while background sync fills threads', () => {
    mocks.isSyncing = true;
    renderPage();
    expect(screen.getByTestId('inbox-loading')).toBeInTheDocument();
  });

  test('shows empty state only once loading settles', () => {
    renderPage();
    expect(screen.getByText('No conversations found')).toBeInTheDocument();
    expect(screen.queryByTestId('inbox-loading')).not.toBeInTheDocument();
  });
});
