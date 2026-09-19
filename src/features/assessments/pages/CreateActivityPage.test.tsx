// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const mocks = vi.hoisted(() => ({
  createActivity: vi.fn(),
  showAlert: vi.fn(),
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    db: { courses: [{ id: 'c1', code: 'CS 101' }] },
    createActivity: mocks.createActivity,
    showAlert: mocks.showAlert,
  }),
}));

import { CreateActivityPage } from './CreateActivityPage';

function renderPage() {
  return render(
    <CreateActivityPage courseId="c1" onBack={() => {}} onActivityCreated={() => {}} />
  );
}

function fillRequiredTitle() {
  const title = screen.getByPlaceholderText(/Activity 4/i);
  fireEvent.change(title, { target: { value: 'Activity 1: Basics' } });
}

describe('CreateActivityPage publish loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('publish button shows loading while the request is in flight', async () => {
    let resolveSave!: (v: { id: string }) => void;
    mocks.createActivity.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    renderPage();
    fillRequiredTitle();

    fireEvent.click(screen.getByRole('button', { name: 'Publish activity' }));

    // Both publish buttons (top bar + bottom bar) reflect the shared state.
    const loading = await screen.findAllByText(/publishing/i);
    expect(loading.length).toBeGreaterThan(0);

    resolveSave({ id: 'a1' });
    await waitFor(() => {
      expect(mocks.createActivity).toHaveBeenCalledTimes(1);
    });
  });

  test('double-clicking publish submits only once', async () => {
    let resolveSave!: (v: { id: string }) => void;
    mocks.createActivity.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    renderPage();
    fillRequiredTitle();

    const publish = screen.getByRole('button', { name: 'Publish activity' });
    fireEvent.click(publish);
    fireEvent.click(publish);

    resolveSave({ id: 'a1' });
    await waitFor(() => {
      expect(mocks.createActivity).toHaveBeenCalledTimes(1);
    });
  });
});
