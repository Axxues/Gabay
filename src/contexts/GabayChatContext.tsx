import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ragApi } from '@/services/ai-chat/api/rag.api';
import type { ChartSpec } from '@/services/lms/types/chart.types';
import { LMSContext } from '@/contexts/LMSContext';
import { generateDynamicProgress, generateInterruptedProgress, isErrorReply } from '@/utils/ragTaskStages';

export interface TaskProgressItem {
  id: string;
  label: string;
  durationMs?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  nodeType?: string;
  depth?: number;
  parent?: string | null;
  runsCount?: number;
}

export interface ChatProgressMetadata {
  executionId?: number;
  totalDurationMs: number;
  totalTokens?: number;
  isError?: boolean;
  interruptedAtStageId?: string;
  tasks: TaskProgressItem[];
}

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

export interface GabayChatContextType {
  conversations: Conversation[];
  activeSessionId: string;
  activeConversation: Conversation;
  isExecuting: boolean;
  executingSessionIds: string[];
  sessionStartTimes: Record<string, number>;
  ragStatus: 'live' | 'connecting' | 'offline';
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
    chart?: ChartSpec | null,
    progress?: ChatProgressMetadata | null
  ) => void;
  sendMessage: (text: string, targetSessionId?: string) => Promise<void>;
  isSessionExecuting: (sessionId: string) => boolean;
  clearAllSessions: () => void;
}

const STORAGE_KEY_PREFIX = 'gabay_chat_sessions_v1';
const USER_ID_KEY = 'gabay_user_id';
const RAG_UNAVAILABLE_MESSAGE =
  'Sorry, the Gabay RAG is currently unavailable. Please check that the n8n backend is running and activated.';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function getCachedUserId(): string | undefined {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(USER_ID_KEY) || undefined;
    }
  } catch {}
  return undefined;
}

export function setCachedUserId(id?: string | null): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (id) {
        window.localStorage.setItem(USER_ID_KEY, id);
      } else {
        window.localStorage.removeItem(USER_ID_KEY);
      }
    }
  } catch {}
}

function getActiveSessionKey(storageKey: string): string {
  return `${storageKey}_active_id`;
}

function loadActiveSessionId(storageKey: string, convos: Conversation[]): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(getActiveSessionKey(storageKey));
      if (saved && convos.some((c) => c.id === saved)) {
        return saved;
      }
    }
  } catch {}
  return convos[0]?.id || `session-${uid()}`;
}

function saveActiveSessionId(storageKey: string, sessionId: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(getActiveSessionKey(storageKey), sessionId);
    }
  } catch {}
}

const createDefaultSession = (): Conversation => ({
  id: `session-${uid()}`,
  title: 'New conversation',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [],
});

function isStaleOrErrorSession(c: Conversation): boolean {
  if (!c || !Array.isArray(c.messages)) return true;
  if (c.title === 'Getting started with Gabay' && c.messages.length <= 1) {
    return true;
  }
  return false;
}

function loadFromStorage(storageKey: string): Conversation[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out error/timeout/legacy sessions
          const cleaned = parsed
            .filter((c: Conversation) => !isStaleOrErrorSession(c))
            .map((c: Conversation) => ({
              ...c,
              messages: (c.messages || []).map((m: ChatMessage, mIdx: number, allMsgs: ChatMessage[]) => {
                let updated = m.isPending
                  ? {
                      ...m,
                      content: m.content || 'Query execution was interrupted. Please try again.',
                      isPending: false,
                    }
                  : m;
                // Dynamically re-evaluate progress for assistant messages using actual prompt and reply
                if (updated.role === 'assistant' && updated.content && updated.progress?.totalDurationMs) {
                  const hasAuthenticTelemetry = Boolean(
                    updated.progress.executionId || updated.progress.tasks?.some((t) => t.nodeType)
                  );
                  if (!hasAuthenticTelemetry) {
                    const prevUser = allMsgs.slice(0, mIdx).reverse().find((pm) => pm.role === 'user');
                    const promptText = updated.prompt || prevUser?.content || '';
                    const hasError = updated.progress.isError || isErrorReply(updated.content);
                    updated = {
                      ...updated,
                      prompt: promptText,
                      startTime: updated.startTime || (updated.timestamp ? new Date(updated.timestamp).getTime() : undefined),
                      progress: hasError
                        ? generateInterruptedProgress(promptText, updated.content, updated.progress.totalDurationMs)
                        : generateDynamicProgress(promptText, updated.content, updated.progress.totalDurationMs),
                    };
                  }
                }
                return updated;
              }),
            }));

          if (cleaned.length > 0) {
            window.localStorage.setItem(storageKey, JSON.stringify(cleaned));
            return cleaned;
          }
        }
      }
    }
  } catch (e) {
    console.error('[GabayChatContext] Failed to load from localStorage:', e);
  }
  const defaultSession = createDefaultSession();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(storageKey, JSON.stringify([defaultSession]));
    }
  } catch {}
  return [defaultSession];
}

function saveToStorage(storageKey: string, convos: Conversation[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(storageKey, JSON.stringify(convos));
    }
  } catch (e) {
    console.error('[GabayChatContext] Failed to persist to localStorage:', e);
  }
}

export const GabayChatContext = createContext<GabayChatContextType | null>(null);

export const GabayChatProvider: React.FC<{ children: React.ReactNode; userId?: string }> = ({
  children,
  userId: propUserId,
}) => {
  const lmsContext = useContext(LMSContext);
  const contextUserId = lmsContext?.activeUser?.id;

  // Resolve user id immediately from prop, live context, or synchronous localStorage cache
  const effectiveUserId = propUserId ?? contextUserId ?? getCachedUserId();
  const storageKey = effectiveUserId ? `${STORAGE_KEY_PREFIX}_${effectiveUserId}` : STORAGE_KEY_PREFIX;

  // Track the storageKey that currently matches the loaded state in memory
  const loadedStorageKeyRef = useRef<string>(storageKey);

  const [conversations, setConversations] = useState<Conversation[]>(() => loadFromStorage(storageKey));
  const [activeSessionId, setActiveSessionId] = useState<string>(() =>
    loadActiveSessionId(storageKey, conversations)
  );
  const [executingSessionIds, setExecutingSessionIds] = useState<string[]>([]);
  const [sessionStartTimes, setSessionStartTimes] = useState<Record<string, number>>({});
  const [ragStatus, setRagStatus] = useState<'live' | 'connecting' | 'offline'>('live');

  // Cache user id for instant synchronous availability on page refreshes
  useEffect(() => {
    if (effectiveUserId) {
      setCachedUserId(effectiveUserId);
    }
  }, [effectiveUserId]);

  // When storageKey changes (e.g. user logs in or switches accounts), reload conversations and active session
  useEffect(() => {
    if (loadedStorageKeyRef.current !== storageKey) {
      const loaded = loadFromStorage(storageKey);
      setConversations(loaded);
      const activeId = loadActiveSessionId(storageKey, loaded);
      setActiveSessionId(activeId);
      loadedStorageKeyRef.current = storageKey;
    }
  }, [storageKey]);

  // Persist conversations ONLY to the key that is currently loaded (never write stale cross-account/unloaded data)
  useEffect(() => {
    if (loadedStorageKeyRef.current === storageKey) {
      saveToStorage(storageKey, conversations);
    }
  }, [conversations, storageKey]);

  // Persist activeSessionId whenever it changes
  useEffect(() => {
    if (activeSessionId && loadedStorageKeyRef.current === storageKey) {
      saveActiveSessionId(storageKey, activeSessionId);
    }
  }, [activeSessionId, storageKey]);

  // Keep activeSessionId valid
  useEffect(() => {
    if (!conversations.some((c) => c.id === activeSessionId)) {
      if (conversations.length > 0) {
        const nextId = conversations[0].id;
        setActiveSessionId(nextId);
        saveActiveSessionId(storageKey, nextId);
      } else {
        const fresh = createDefaultSession();
        setConversations([fresh]);
        setActiveSessionId(fresh.id);
        saveActiveSessionId(storageKey, fresh.id);
      }
    }
  }, [conversations, activeSessionId, storageKey]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeSessionId) || conversations[0] || createDefaultSession();
  }, [conversations, activeSessionId]);

  const isExecuting = useMemo(() => {
    return executingSessionIds.includes(activeSessionId);
  }, [executingSessionIds, activeSessionId]);

  const isSessionExecuting = useCallback(
    (sessionId: string) => {
      return executingSessionIds.includes(sessionId);
    },
    [executingSessionIds]
  );

  const startNewChat = useCallback(() => {
    const newSession: Conversation = {
      id: `session-${uid()}`,
      title: 'New conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setConversations((prev) => {
      const next = [newSession, ...prev];
      saveToStorage(storageKey, next);
      return next;
    });
    setActiveSessionId(newSession.id);
    saveActiveSessionId(storageKey, newSession.id);
    return newSession.id;
  }, [storageKey]);

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    saveActiveSessionId(storageKey, id);
  }, [storageKey]);

  const renameSession = useCallback(
    (id: string, newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === id ? { ...c, title: trimmed, updatedAt: new Date().toISOString() } : c
        );
        saveToStorage(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  const deleteSession = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        const next = filtered.length === 0 ? [createDefaultSession()] : filtered;
        saveToStorage(storageKey, next);
        setActiveSessionId((currentActiveId) => {
          if (currentActiveId === id || !next.some((c) => c.id === currentActiveId)) {
            const newActiveId = next[0].id;
            saveActiveSessionId(storageKey, newActiveId);
            return newActiveId;
          }
          return currentActiveId;
        });
        return next;
      });
    },
    [storageKey]
  );

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
        progress: message.progress ?? null,
        prompt: (message as any).prompt || undefined,
        startTime: (message as any).startTime || (message.isPending ? Date.now() : undefined),
      };

      setConversations((prev) => {
        const next = prev.map((c) => {
          if (c.id !== sessionId) return c;

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
        });
        saveToStorage(storageKey, next);
        return next;
      });

      return fullMessage;
    },
    [storageKey]
  );

  const updateAssistantMessage = useCallback(
    (sessionId: string, msgId: string, chunk: string, isComplete = false, chart?: ChartSpec | null, progress?: ChatProgressMetadata | null) => {
      setConversations((prev) => {
        const next = prev.map((c) => {
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
                ...(progress !== undefined ? { progress } : {}),
              };
            }),
          };
        });
        saveToStorage(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  const sendMessage = useCallback(
    async (text: string, targetSessionId?: string) => {
      const sessionId = targetSessionId || activeSessionId;
      const cleanText = text.trim();
      if (!cleanText || executingSessionIds.includes(sessionId)) return;

      const startTime = Date.now();
      setSessionStartTimes((prev) => ({ ...prev, [sessionId]: startTime }));

      // 1. Add user message
      addMessage(sessionId, {
        role: 'user',
        content: cleanText,
      });

      // 2. Add pending assistant placeholder message
      const pendingMsgId = `pending-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      addMessage(sessionId, {
        id: pendingMsgId,
        role: 'assistant',
        content: '',
        isPending: true,
        sources: [],
        chart: null,
        prompt: cleanText,
        startTime,
      });

      // 3. Mark executing
      setExecutingSessionIds((prev) => [...prev, sessionId]);
      setRagStatus('connecting');

      try {
        // Asynchronously execute query against n8n / Express proxy
        const res = await ragApi.sendMessage(cleanText, sessionId);
        setRagStatus('live');

        const totalDurationMs = Math.max(Date.now() - startTime, 500);
        const progressMetadata =
          res.execution && res.execution.tasks && res.execution.tasks.length > 0
            ? res.execution
            : generateDynamicProgress(cleanText, res.reply, totalDurationMs);

        // 4. Update the placeholder message with full response and persist
        setConversations((prev) => {
          const next = prev.map((c) => {
            if (c.id !== sessionId) return c;
            return {
              ...c,
              updatedAt: new Date().toISOString(),
              messages: c.messages.map((m) => {
                if (m.id !== pendingMsgId) return m;
                return {
                  ...m,
                  content: res.reply,
                  sources: res.sources,
                  chart: res.chart ?? null,
                  isPending: false,
                  prompt: cleanText,
                  startTime,
                  progress: progressMetadata,
                };
              }),
            };
          });
          saveToStorage(storageKey, next);
          return next;
        });
      } catch (err: unknown) {
        setRagStatus('offline');
        const detail =
          err instanceof Error && err.message && err.message !== 'Request failed (502).'
            ? ` (${err.message})`
            : '';
        const errorReply = `${RAG_UNAVAILABLE_MESSAGE}${detail}`;
        const totalDurationMs = Math.max(Date.now() - startTime, 500);
        const progressMetadata = generateInterruptedProgress(cleanText, errorReply, totalDurationMs);

        setConversations((prev) => {
          const next = prev.map((c) => {
            if (c.id !== sessionId) return c;
            return {
              ...c,
              updatedAt: new Date().toISOString(),
              messages: c.messages.map((m) => {
                if (m.id !== pendingMsgId) return m;
                return {
                  ...m,
                  content: errorReply,
                  sources: [],
                  chart: null,
                  isPending: false,
                  progress: progressMetadata,
                };
              }),
            };
          });
          saveToStorage(storageKey, next);
          return next;
        });
      } finally {
        setExecutingSessionIds((prev) => prev.filter((id) => id !== sessionId));
        setSessionStartTimes((prev) => {
          const next = { ...prev };
          delete next[sessionId];
          return next;
        });
      }
    },
    [activeSessionId, executingSessionIds, addMessage, storageKey]
  );

  const clearAllSessions = useCallback(() => {
    const fresh = createDefaultSession();
    setConversations([fresh]);
    setActiveSessionId(fresh.id);
    saveToStorage(storageKey, [fresh]);
    saveActiveSessionId(storageKey, fresh.id);
  }, [storageKey]);

  const value = useMemo<GabayChatContextType>(
    () => ({
      conversations,
      activeSessionId,
      activeConversation,
      isExecuting,
      executingSessionIds,
      sessionStartTimes,
      ragStatus,
      startNewChat,
      selectSession,
      renameSession,
      deleteSession,
      addMessage,
      updateAssistantMessage,
      sendMessage,
      isSessionExecuting,
      clearAllSessions,
    }),
    [
      conversations,
      activeSessionId,
      activeConversation,
      isExecuting,
      executingSessionIds,
      sessionStartTimes,
      ragStatus,
      startNewChat,
      selectSession,
      renameSession,
      deleteSession,
      addMessage,
      updateAssistantMessage,
      sendMessage,
      isSessionExecuting,
      clearAllSessions,
    ]
  );

  return <GabayChatContext.Provider value={value}>{children}</GabayChatContext.Provider>;
};

export function useGabayChat(): GabayChatContextType {
  const ctx = useContext(GabayChatContext);
  if (!ctx) {
    throw new Error('useGabayChat must be used within a GabayChatProvider');
  }
  return ctx;
}
