import { apiFetch } from '@/services/core/client';
import type { RagResponse, ChatProgressMetadata } from '@/services/ai-chat/types/rag.types';

export const ragApi = {
  sendMessage: (message: string, sessionId: string): Promise<RagResponse> =>
    apiFetch<RagResponse>('/api/rag/chat', { method: 'POST', body: { message, sessionId } }),
  getProgress: async (sessionId: string): Promise<{ execution: ChatProgressMetadata | null }> => {
    try {
      return await apiFetch<{ execution: ChatProgressMetadata | null }>(
        `/api/rag/progress/${encodeURIComponent(sessionId)}`,
        { method: 'GET' },
      );
    } catch {
      return { execution: null };
    }
  },
};
