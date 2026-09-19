import { describe, it, expect } from 'vitest';
import { isLmsSectionTab } from '@/constants/navigation';

describe('edit-account navigation', () => {
  it('renders full-width without the LMS context panel, like create-account', () => {
    expect(isLmsSectionTab('create-account')).toBe(false);
    expect(isLmsSectionTab('edit-account')).toBe(false);
  });

  it('EditAccountPage module exists and exports the page component', async () => {
    const mod = await import('@/features/accounts/pages/EditAccountPage');
    expect(mod.EditAccountPage).toBeDefined();
  });
});
