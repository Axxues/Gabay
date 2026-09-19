import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import type { ChartSpec } from '@/services/lms/types/chart.types';
import { GabayChatContext } from '@/contexts/GabayChatContext';
import type { ChatProgressMetadata } from '@/services/ai-chat/types/rag.types';

export interface ChatSource {
  label: string;
  detail: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: ChatSource[];
  chart?: ChartSpec | null;
  isPending?: boolean;
  progress?: ChatProgressMetadata | null;
  prompt?: string;
  startTime?: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const STORAGE_KEY_PREFIX = 'gabay_chat_sessions_v1';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createDefaultSession = (): Conversation => ({
  id: `session-${uid()}`,
  title: 'New conversation',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [],
});

function isStaleOrErrorSession(c: Conversation): boolean {
  if (!c || !Array.isArray(c.messages)) return true;
  const hasErrorMessage = c.messages.some((m: ChatMessage) =>
    m.content?.includes('RAG timed out after 60s') ||
    m.content?.includes('Sorry, the Gabay RAG is currently unavailable')
  );
  if (hasErrorMessage) return true;
  if (c.title?.toLowerCase().includes('how many students') && (c.messages.length === 0 || c.messages.every(m => m.role === 'user' || m.content?.includes('unavailable')))) {
    return true;
  }
  if (c.title === 'Getting started with Gabay' && c.messages.length <= 1) {
    return true;
  }
  return false;
}

function useStandaloneChatSessions(userId?: string) {
  const storageKey = userId ? `${STORAGE_KEY_PREFIX}_${userId}` : STORAGE_KEY_PREFIX;

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleaned = parsed.filter((c: Conversation) => !isStaleOrErrorSession(c));
            if (cleaned.length > 0) return cleaned;
          }
        }
      }
    } catch (e) {
      console.error('[useChatSessions] Failed to load from localStorage:', e);
    }
    return [createDefaultSession()];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return conversations[0]?.id || `session-${uid()}`;
  });

  // Sync state to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(storageKey, JSON.stringify(conversations));
      }
    } catch (e) {
      console.error('[useChatSessions] Failed to persist to localStorage:', e);
    }
  }, [conversations, storageKey]);

  // Ensure activeSessionId points to a valid conversation
  useEffect(() => {
    if (!conversations.some((c) => c.id === activeSessionId)) {
      if (conversations.length > 0) {
        setActiveSessionId(conversations[0].id);
      } else {
        const fresh = createDefaultSession();
        setConversations([fresh]);
        setActiveSessionId(fresh.id);
      }
    }
  }, [conversations, activeSessionId]);

  const activeConversation = useMemo(() => {
    return (
      conversations.find((c) => c.id === activeSessionId) ||
      conversations[0] ||
      createDefaultSession()
    );
  }, [conversations, activeSessionId]);

  const startNewChat = useCallback(() => {
    const newSession: Conversation = {
      id: `session-${uid()}`,
      title: 'New conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setConversations((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  }, []);

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const renameSession = useCallback((id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, title: trimmed, updatedAt: new Date().toISOString() } : c
      )
    );
  }, []);

  const deleteSession = useCallback((id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      const next = filtered.length === 0 ? [createDefaultSession()] : filtered;
      setActiveSessionId((currentActiveId) => {
        if (currentActiveId === id || !next.some((c) => c.id === currentActiveId)) {
          return next[0].id;
        }
        return currentActiveId;
      });
      return next;
    });
  }, []);

  const addMessage = useCallback(
    (
      sessionId: string,
      message: Omit<ChatMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: string; isPending?: boolean }
    ): ChatMessage => {
      const fullMessage: ChatMessage = {
        id: message.id || `msg-${uid()}`,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString(),
        sources: message.sources,
        chart: message.chart ?? null,
        isPending: message.isPending ?? false,
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== sessionId) return c;

          // Auto-generate conversation title from user's first prompt if it's currently generic
          let newTitle = c.title;
          if (
            (c.title === 'New conversation' || c.title === 'Getting started with Gabay') &&
            message.role === 'user'
          ) {
            const cleanPrompt = message.content.trim().replace(/\n+/g, ' ');
            newTitle = cleanPrompt.length > 36 ? `${cleanPrompt.slice(0, 36)}...` : cleanPrompt;
          }

          return {
            ...c,
            title: newTitle,
            updatedAt: new Date().toISOString(),
            messages: [...c.messages, fullMessage],
          };
        })
      );

      return fullMessage;
    },
    []
  );

  const updateAssistantMessage = useCallback(
    (
      sessionId: string,
      msgId: string,
      chunk: string,
      isComplete = false,
      chart?: ChartSpec | null
    ) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== sessionId) return c;
          return {
            ...c,
            updatedAt: new Date().toISOString(),
            messages: c.messages.map((m) => {
              if (m.id !== msgId) return m;
              return {
                ...m,
                content: chunk,
                ...(isComplete ? { isPending: false } : {}),
                ...(chart !== undefined ? { chart } : {}),
              };
            }),
          };
        })
      );
    },
    []
  );

  const clearAllSessions = useCallback(() => {
    const fresh = createDefaultSession();
    setConversations([fresh]);
    setActiveSessionId(fresh.id);
  }, []);

  return {
    conversations,
    activeSessionId,
    activeConversation,
    startNewChat,
    selectSession,
    renameSession,
    deleteSession,
    addMessage,
    updateAssistantMessage,
    clearAllSessions,
  };
}

export interface UseChatSessionsResult {
  conversations: Conversation[];
  activeSessionId: string;
  activeConversation: Conversation;
  startNewChat: () => string;
  selectSession: (id: string) => void;
  renameSession: (id: string, newTitle: string) => void;
  deleteSession: (id: string) => void;
  addMessage: (
    sessionId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: string; isPending?: boolean; progress?: ChatProgressMetadata | null; prompt?: string; startTime?: number }
  ) => ChatMessage;
  updateAssistantMessage: (
    sessionId: string,
    msgId: string,
    chunk: string,
    isComplete?: boolean,
    chart?: ChartSpec | null
  ) => void;
  clearAllSessions: () => void;
}

export function useChatSessions(userId?: string): UseChatSessionsResult {
  const context = useContext(GabayChatContext);
  const standalone = useStandaloneChatSessions(userId);
  if (context && !userId) {
    return context;
  }
  return standalone;
}
