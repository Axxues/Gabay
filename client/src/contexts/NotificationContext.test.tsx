import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NotificationProvider, useNotifications } from './NotificationContext';

describe('NotificationContext', () => {
  it('throws an error if useNotifications is called outside NotificationProvider', () => {
    expect(() => renderHook(() => useNotifications())).toThrow('useNotifications must be used within a NotificationProvider');
  });

  it('manages unread counts', () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: ({ children }) => <NotificationProvider>{children}</NotificationProvider>,
    });

    expect(result.current.unreadNotifications).toBe(0);
    act(() => {
      result.current.setUnreadNotifications(5);
    });
    expect(result.current.unreadNotifications).toBe(5);
  });
});
