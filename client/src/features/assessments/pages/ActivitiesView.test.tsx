// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  isLoading: false,
  isSyncing: false,
  db: { activities: [], submissions: [] } as any,
  effectiveTerms: ['midterm', 'finals'] as string[],
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    activeRole: 'faculty',
    activeUser: { id: 'u-fac-1', name: 'Faculty', role: 'faculty' },
    db: mocks.db,
    effectiveTermsForCourse: () => mocks.effectiveTerms,
    isLoading: mocks.isLoading,
    isSyncing: mocks.isSyncing,
    submitActivity: vi.fn(),
    deleteActivity: vi.fn(),
    openSpeedGrader: vi.fn(),
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
  }),
}));

import { ActivitiesView } from './ActivitiesView';

function renderPage() {
  return render(
    <ActivitiesView
      courseId="c1"
      selectedActivityId={null}
      onSelectActivity={() => {}}
      onBackToModules={() => {}}
    />
  );
}

describe('ActivitiesView refresh loading', () => {
  beforeEach(() => {
    mocks.isLoading = false;
    mocks.isSyncing = false;
    mocks.db = { activities: [], submissions: [] } as any;
    mocks.effectiveTerms = ['midterm', 'finals'];
  });

  test('shows loading skeleton (not empty text) while bootstrapping', () => {
    mocks.isLoading = true;
    renderPage();
    expect(screen.getByTestId('activities-loading')).toBeInTheDocument();
    expect(screen.queryByText(/no activities published/i)).not.toBeInTheDocument();
  });

  test('shows loading skeleton while background sync fills activities', () => {
    mocks.isSyncing = true;
    renderPage();
    expect(screen.getByTestId('activities-loading')).toBeInTheDocument();
  });

  test('shows empty state only once loading settles', () => {
    renderPage();
    expect(screen.getByText(/no activities published/i)).toBeInTheDocument();
    expect(screen.queryByTestId('activities-loading')).not.toBeInTheDocument();
  });
});

describe('ActivitiesView term filter', () => {
  beforeEach(() => {
    mocks.isLoading = false;
    mocks.isSyncing = false;
    mocks.db = { activities: [], submissions: [] } as any;
    mocks.effectiveTerms = ['midterm', 'finals'];
  });

  test('shows a term filter on the Activities list', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /filter by term/i })).toBeInTheDocument();
  });

  test('filters classic activities and question sets by term', () => {
    mocks.db = {
      activities: [
        {
          id: 'asg-mid',
          courseId: 'c1',
          title: 'Midterm Lab',
          instructions: '',
          term: 'midterm',
          format: 'classic',
          pointsPossible: 100,
          dueDate: new Date().toISOString(),
          submissionTypes: ['online_text'],
          published: true,
          category: 'Activities',
          weight: 20,
          rubric: [],
        },
        {
          id: 'asg-fin',
          courseId: 'c1',
          title: 'Finals Lab',
          instructions: '',
          term: 'finals',
          format: 'classic',
          pointsPossible: 100,
          dueDate: new Date().toISOString(),
          submissionTypes: ['online_text'],
          published: true,
          category: 'Activities',
          weight: 20,
          rubric: [],
        },
        {
          id: 'act-mid',
          courseId: 'c1',
          title: 'Midterm Set',
          instructions: '',
          term: 'midterm',
          format: 'questionset',
          questions: [],
          pointsPossible: 10,
          published: true,
        },
      ],
      submissions: [],
    } as any;
    renderPage();
    expect(screen.getByText('Midterm Lab')).toBeInTheDocument();
    expect(screen.getByText('Finals Lab')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /filter by term/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Midterm' }));

    expect(screen.getByText('Midterm Lab')).toBeInTheDocument();
    expect(screen.queryByText('Finals Lab')).not.toBeInTheDocument();
  });

  test('renders classic and question-set activities side by side', () => {
    mocks.db = {
      activities: [
        {
          id: 'asg-1',
          courseId: 'c1',
          title: 'Classic Lab Activity',
          instructions: '',
          term: 'midterm',
          format: 'classic',
          pointsPossible: 100,
          dueDate: new Date().toISOString(),
          submissionTypes: ['online_text'],
          published: true,
          category: 'Activities',
          weight: 20,
          rubric: [],
        },
        {
          id: 'act-1',
          courseId: 'c1',
          title: 'Question Set Activity',
          instructions: '',
          term: 'midterm',
          format: 'questionset',
          questions: [],
          pointsPossible: 10,
          published: true,
        },
      ],
      submissions: [],
    } as any;
    renderPage();
    expect(screen.getByText('Classic Lab Activity')).toBeInTheDocument();
    expect(screen.getByText('Question Set Activity')).toBeInTheDocument();
  });
});
