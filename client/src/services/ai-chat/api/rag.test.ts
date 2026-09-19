// src/services/ai-chat/api/rag.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ragApi } from '@/services/ai-chat/api/rag.api';

describe('ragApi.sendMessage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    const store = new Map<string, string>();
    store.set('gabay_token', 'tok-123');
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => { store.clear(); },
    });
  });

  it('posts message + sessionId and returns reply', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        reply: 'Hello from LIKHA',
        sources: [{ label: 'LIKHA RAG', detail: 'Qdrant' }],
        sessionId: 'convo-1',
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await ragApi.sendMessage('What is enrollment?', 'convo-1');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body?: string }];
    expect(url).toBe('/api/rag/chat');
    expect(JSON.parse(String(init.body)).message).toBe('What is enrollment?');
    expect(res.reply).toBe('Hello from LIKHA');
  });
});
