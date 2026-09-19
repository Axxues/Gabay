// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  createAnnouncement: vi.fn(),
  showAlert: vi.fn(),
}));

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    db: { courses: [{ id: 'c1', code: 'CS 101' }] },
    createAnnouncement: mocks.createAnnouncement,
    showAlert: mocks.showAlert,
  }),
}));

import { CreateAnnouncementPage } from './CreateAnnouncementPage';

function renderPage() {
  return render(
    <CreateAnnouncementPage courseId="c1" onBack={() => {}} onAnnouncementCreated={() => {}} />
  );
}

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText(/Schedule for Midterm/i), {
    target: { value: 'Midterm schedule' },
  });
  fireEvent.change(screen.getByPlaceholderText(/Draft your announcement/i), {
    target: { value: 'Midterms move to Friday.' },
  });
}

describe('CreateAnnouncementPage publish loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('publish button shows loading while the request is in flight', async () => {
    let resolveSave!: (v: unknown) => void;
    mocks.createAnnouncement.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    renderPage();
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Publish announcement' }));

    expect(await screen.findByText(/publishing/i)).toBeInTheDocument();

    resolveSave({ id: 'an1' });
    await waitFor(() => {
      expect(mocks.createAnnouncement).toHaveBeenCalledTimes(1);
    });
  });

  test('double submit publishes only once', async () => {
    let resolveSave!: (v: unknown) => void;
    mocks.createAnnouncement.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    renderPage();
    fillRequiredFields();

    const publish = screen.getByRole('button', { name: 'Publish announcement' });
    fireEvent.click(publish);
    fireEvent.click(publish);

    resolveSave({ id: 'an1' });
    await waitFor(() => {
      expect(mocks.createAnnouncement).toHaveBeenCalledTimes(1);
    });
  });
});
