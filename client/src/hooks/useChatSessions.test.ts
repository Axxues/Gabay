// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatSessions } from './useChatSessions';

describe('useChatSessions', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('initializes with a default empty session if storage is empty', () => {
    const { result } = renderHook(() => useChatSessions('user-1'));
    expect(result.current.conversations.length).toBe(1);
    expect(result.current.activeSessionId).toBeDefined();
    expect(result.current.activeConversation.title).toBe('New conversation');
    expect(result.current.activeConversation.messages.length).toBe(0);
  });

  it('creates a new chat session and switches to it', () => {
    const { result } = renderHook(() => useChatSessions('user-1'));
    let newId = '';
    act(() => {
      newId = result.current.startNewChat();
    });
    expect(result.current.activeSessionId).toBe(newId);
    expect(result.current.conversations.length).toBe(2);
  });

  it('renames and deletes sessions', () => {
    const { result } = renderHook(() => useChatSessions('user-1'));
    const firstId = result.current.activeSessionId;
    act(() => {
      result.current.renameSession(firstId, 'Enrollment Q&A');
    });
    expect(result.current.activeConversation.title).toBe('Enrollment Q&A');

    let secondId = '';
    act(() => {
      secondId = result.current.startNewChat();
    });
    expect(result.current.activeSessionId).toBe(secondId);

    act(() => {
      result.current.deleteSession(firstId);
    });
    expect(result.current.conversations.some((c: { id: string }) => c.id === firstId)).toBe(false);
  });

  it('appends messages and auto-titles from user prompt', () => {
    const { result } = renderHook(() => useChatSessions('user-1'));
    let newId = '';
    act(() => {
      newId = result.current.startNewChat();
    });

    act(() => {
      result.current.addMessage(newId, {
        role: 'user',
        content: 'How many students are enrolled?',
      });
    });

    expect(result.current.activeConversation.messages.length).toBe(1);
    expect(result.current.activeConversation.messages[0].content).toBe(
      'How many students are enrolled?'
    );
    expect(result.current.activeConversation.title).toBe('How many students are enrolled?');
  });
});
