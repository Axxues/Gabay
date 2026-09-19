// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  createExam: vi.fn(),
  showAlert: vi.fn(),
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    db: { courses: [{ id: 'c1', code: 'CS 101' }] },
    createExam: mocks.createExam,
    showAlert: mocks.showAlert,
  }),
}));

import { CreateExamPage } from './CreateExamPage';

function renderPage() {
  return render(
    <CreateExamPage courseId="c1" onBack={() => {}} onExamCreated={() => {}} />
  );
}

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText('Untitled Exam'), {
    target: { value: 'Midterm Exam' },
  });
  fireEvent.change(screen.getByPlaceholderText('Question 1'), {
    target: { value: 'What is 2+2?' },
  });
}

describe('CreateExamPage publish loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('publish button shows loading while the request is in flight', async () => {
    let resolveSave!: (v: { id: string }) => void;
    mocks.createExam.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    renderPage();
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Publish exam' }));

    const loading = await screen.findAllByText(/publishing/i);
    expect(loading.length).toBeGreaterThan(0);

    resolveSave({ id: 'e1' });
    await waitFor(() => {
      expect(mocks.createExam).toHaveBeenCalledTimes(1);
    });
  });

  test('double-clicking publish submits only once', async () => {
    let resolveSave!: (v: { id: string }) => void;
    mocks.createExam.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    renderPage();
    fillRequiredFields();

    const publish = screen.getByRole('button', { name: 'Publish exam' });
    fireEvent.click(publish);
    fireEvent.click(publish);

    resolveSave({ id: 'e1' });
    await waitFor(() => {
      expect(mocks.createExam).toHaveBeenCalledTimes(1);
    });
  });
});
