// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const mocks = vi.hoisted(() => ({
  createQuiz: vi.fn(),
  showAlert: vi.fn(),
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    db: { courses: [{ id: 'c1', code: 'CS 101' }] },
    createQuiz: mocks.createQuiz,
    showAlert: mocks.showAlert,
  }),
}));

import { CreateQuizPage } from './CreateQuizPage';

function renderPage() {
  return render(
    <CreateQuizPage courseId="c1" onBack={() => {}} onQuizCreated={() => {}} />
  );
}

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText('Untitled Quiz'), {
    target: { value: 'Quiz 1' },
  });
  fireEvent.change(screen.getByPlaceholderText('Question 1'), {
    target: { value: 'What is 2+2?' },
  });
}

describe('CreateQuizPage publish loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('publish button shows loading while the request is in flight', async () => {
    let resolveSave!: (v: { id: string }) => void;
    mocks.createQuiz.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    renderPage();
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Publish quiz' }));

    const loading = await screen.findAllByText(/publishing/i);
    expect(loading.length).toBeGreaterThan(0);

    resolveSave({ id: 'q1' });
    await waitFor(() => {
      expect(mocks.createQuiz).toHaveBeenCalledTimes(1);
    });
  });

  test('double-clicking publish submits only once', async () => {
    let resolveSave!: (v: { id: string }) => void;
    mocks.createQuiz.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    renderPage();
    fillRequiredFields();

    const publish = screen.getByRole('button', { name: 'Publish quiz' });
    fireEvent.click(publish);
    fireEvent.click(publish);

    resolveSave({ id: 'q1' });
    await waitFor(() => {
      expect(mocks.createQuiz).toHaveBeenCalledTimes(1);
    });
  });
});
