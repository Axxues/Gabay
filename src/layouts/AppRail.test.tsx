// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AppRail } from '@/layouts/AppRail';
import { GabayChatContext } from '@/contexts/GabayChatContext';

vi.mock('@/contexts/LMSContext', () => ({
  useLMS: () => ({
    activeRole: 'student',
    activeUser: { id: 'u1' },
    logout: vi.fn(),
    showConfirm: vi.fn(),
    db: { messages: [] },
  }),
}));

describe('AppRail Navigation', () => {
  it('does not rotate Gabay icon and has no red dot when no ongoing process', () => {
    render(
      <GabayChatContext.Provider
        value={
          {
            executingSessionIds: [],
          } as any
        }
      >
        <AppRail currentTab="dashboard" onNavigateTab={vi.fn()} />
      </GabayChatContext.Provider>
    );

    const gabayBtn = screen.getByTitle(/Gabay RAG/i);
    expect(gabayBtn).toBeInTheDocument();

    const icon = gabayBtn.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon?.classList.contains('animate-spin')).toBe(false);

    // No red dot / ping element
    expect(gabayBtn.querySelector('.animate-ping')).toBeNull();
  });

  it('rotates the Gabay icon when there is an ongoing process and does NOT render a red dot', () => {
    render(
      <GabayChatContext.Provider
        value={
          {
            executingSessionIds: ['session-123'],
          } as any
        }
      >
        <AppRail currentTab="dashboard" onNavigateTab={vi.fn()} />
      </GabayChatContext.Provider>
    );

    const gabayBtn = screen.getByTitle(/GABAY is processing/i);
    expect(gabayBtn).toBeInTheDocument();

    const icon = gabayBtn.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon?.classList.contains('animate-spin')).toBe(true);

    // Absolutely NO red dot / ping element
    expect(gabayBtn.querySelector('.animate-ping')).toBeNull();
    expect(gabayBtn.querySelector('.bg-primary.rounded-full')).toBeNull();
  });
});
