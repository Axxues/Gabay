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
    db: { modules: [] },
    isLoading: mocks.isLoading,
    isSyncing: mocks.isSyncing,
    createModule: vi.fn(),
    updateModule: vi.fn(),
    deleteModule: vi.fn(),
    deleteModuleItem: vi.fn(),
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
    addModuleComment: vi.fn(),
    editModuleComment: vi.fn(),
    deleteModuleComment: vi.fn(),
    toggleLikeModuleComment: vi.fn(),
    markModuleCommentsRead: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { ModulesView } from './ModulesView';

function renderPage() {
  return render(
    <ModulesView courseId="c1" onSelectActivity={() => {}} onSelectQuiz={() => {}} />
  );
}

describe('ModulesView refresh loading', () => {
  beforeEach(() => {
    mocks.isLoading = false;
    mocks.isSyncing = false;
  });

  test('shows loading skeleton (not "no modules") while bootstrapping', () => {
    mocks.isLoading = true;
    renderPage();
    expect(screen.getByTestId('modules-loading')).toBeInTheDocument();
    expect(screen.queryByText(/no modules available/i)).not.toBeInTheDocument();
  });

  test('shows loading skeleton while background sync fills modules', () => {
    mocks.isSyncing = true;
    renderPage();
    expect(screen.getByTestId('modules-loading')).toBeInTheDocument();
    expect(screen.queryByText(/no modules available/i)).not.toBeInTheDocument();
  });

  test('shows empty state only once loading fully settles', () => {
    renderPage();
    expect(screen.getByText(/no modules available/i)).toBeInTheDocument();
    expect(screen.queryByTestId('modules-loading')).not.toBeInTheDocument();
  });
});
