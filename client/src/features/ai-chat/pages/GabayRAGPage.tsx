import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useGabayChat } from '@/contexts/GabayChatContext';
import { ChatMarkdown } from '@/features/ai-chat/components/chat/ChatMarkdown';
import { ChatProgressTimeline } from '@/features/ai-chat/components/chat/ChatProgressTimeline';
import {
  Sparkles,
  Plus,
  Search,
  Send,
  Trash2,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  BookOpen,
  CalendarDays,
  GraduationCap,
  X,
  Edit2,
  Download,
  BarChart3,
} from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: <BookOpen className="h-4 w-4" />,
    title: 'Student Enrollment',
    prompt: 'How many students are currently enrolled in the school system?',
  },
  {
    icon: <BarChart3 className="h-4 w-4" />,
    title: 'Visual Breakdown',
    prompt: 'Can you show me a chart breakdown of enrolled students by status?',
  },
  {
    icon: <CalendarDays className="h-4 w-4" />,
    title: 'Academic Subjects',
    prompt: 'What courses and subjects are offered for the academic term?',
  },
  {
    icon: <GraduationCap className="h-4 w-4" />,
    title: 'Scholarships & Fees',
    prompt: 'What scholarships are available and what are their benefits?',
  },
];

export const GabayRAGPage: React.FC = () => {
  const {
    conversations,
    activeSessionId,
    activeConversation,
    startNewChat,
    selectSession,
    renameSession,
    deleteSession,
    sendMessage,
    isExecuting,
    sessionStartTimes,
    ragStatus,
  } = useGabayChat();

  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportCopied, setExportCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const feedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeConversation?.messages.length, isExecuting]);

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const handleStartNewChat = () => {
    startNewChat();
    setMobileHistoryOpen(false);
    setInput('');
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleSend = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || isExecuting || !activeConversation) return;

    setInput('');
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    });

    sendMessage(text, activeConversation.id);
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* clipboard fallback */
    }
  };

  const handleExportChat = async () => {
    if (!activeConversation) return;
    const title = activeConversation.title;
    const date = new Date(activeConversation.createdAt).toLocaleDateString();
    let md = `# LIKHA School System Report: ${title}\n*Generated on: ${date}*\n\n---\n\n`;

    activeConversation.messages.forEach((m) => {
      const speaker = m.role === 'user' ? '👤 **User**' : '✨ **GABAY (School Assistant)**';
      md += `${speaker} (${new Date(m.timestamp).toLocaleTimeString()}):\n\n${m.content}\n\n`;
      if (m.chart) {
        md += `*Attached Chart: ${m.chart.title || m.chart.type}*\n\n`;
      }
      md += `---\n\n`;
    });

    try {
      await navigator.clipboard.writeText(md);
      setExportCopied(true);
      window.setTimeout(() => setExportCopied(false), 2000);
    } catch {
      /* fallback */
    }
  };

  const startInlineEdit = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const commitInlineEdit = (id: string) => {
    if (editingTitle.trim()) {
      renameSession(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const historyPanel = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-3">
        <button
          type="button"
          onClick={handleStartNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground shadow-primary-sm transition-all hover:bg-primary/90 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          New chat
        </button>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-8 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        {filteredConversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
            No conversations found.
          </p>
        ) : (
          filteredConversations.map((c) => {
            const selected = c.id === activeSessionId;
            const preview =
              c.messages.length > 0
                ? c.messages[c.messages.length - 1].content.slice(0, 60)
                : 'No messages yet';

            return (
                <div
                  key={c.id}
                  className={`group relative rounded-xl border px-3 py-2.5 transition-all ${
                    selected
                      ? 'border-border bg-muted shadow-soft'
                      : 'border-transparent hover:bg-muted/50'
                  }`}
                >
                {editingId === c.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => commitInlineEdit(c.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitInlineEdit(c.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="w-full rounded border border-primary bg-background px-1.5 py-0.5 text-xs font-bold text-foreground outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => commitInlineEdit(c.id)}
                      className="rounded p-1 text-primary hover:bg-primary/20"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      selectSession(c.id);
                      setMobileHistoryOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectSession(c.id);
                        setMobileHistoryOpen(false);
                      }
                    }}
                    className="flex w-full items-start gap-2.5 text-left cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-[13px] font-bold tracking-tight ${
                          selected ? 'text-foreground' : 'text-foreground'
                        }`}
                      >
                        {c.title}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                        {preview}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => startInlineEdit(c.id, c.title, e)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Rename conversation"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(c.id);
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border/70 p-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                ragStatus === 'live'
                  ? 'bg-emerald-500'
                  : ragStatus === 'connecting'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-muted-foreground/40'
              }`}
            />
            {ragStatus === 'live' ? 'RAG active' : ragStatus === 'connecting' ? 'Processing…' : 'RAG offline'}
          </span>
          <span className="tabular-nums">{conversations.length} sessions</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 bg-background">
      {/* Desktop history sidebar */}
      {sidebarOpen && (
        <div className="hidden min-h-0 w-72 shrink-0 border-r border-border bg-card md:flex md:flex-col">
          {historyPanel}
        </div>
      )}

      {/* Mobile history drawer */}
      {mobileHistoryOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileHistoryOpen(false)}
          />
          <div className="relative flex w-80 max-w-[85vw] flex-col bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-3">
              <span className="text-xs font-bold text-foreground">Conversations</span>
              <button
                type="button"
                onClick={() => setMobileHistoryOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {historyPanel}
          </div>
        </div>
      )}

      {/* Main chat column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-card px-3 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileHistoryOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden cursor-pointer"
              aria-label="Open chat history"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:block cursor-pointer"
              aria-label="Toggle chat history"
              title="Toggle chat history"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground text-[13px] font-extrabold text-background">
              G
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[14px] font-extrabold tracking-tight text-foreground">
                Gabay assistant
              </h1>
              <p className="truncate text-[12px] text-muted-foreground">
                {activeConversation?.title ?? 'New conversation'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportChat}
              title="Export conversation as markdown"
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground cursor-pointer"
            >
              {exportCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleStartNewChat}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground shadow-primary-sm transition-all hover:bg-primary/90 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New chat</span>
            </button>
          </div>
        </div>

        {/* Chat scroll feed */}
        <div ref={feedRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-3xl">
            {(!activeConversation || activeConversation.messages.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-10 text-center sm:py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted border border-border text-lg font-extrabold text-foreground">
                  G
                </div>
                <h2 className="mt-4 text-[18px] font-extrabold tracking-tight text-foreground">
                  How can I help?
                </h2>
                <p className="mt-1.5 max-w-md text-[12.5px] text-muted-foreground leading-relaxed">
                  Ask about enrollment, courses, scholarships, and school records.
                </p>

                <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(item.prompt)}
                      disabled={isExecuting}
                      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-all hover:border-muted-foreground/30 hover:shadow-soft active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground">
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-bold tracking-tight text-foreground">{item.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
                          {item.prompt}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {activeConversation.messages.map((msg) =>
                  msg.role === 'user' ? (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[13px] text-primary-foreground sm:max-w-[75%]">
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3">
                        {msg.isPending ? (
                          <ChatProgressTimeline isPending={true} prompt={msg.prompt} sessionId={activeSessionId} startTime={msg.startTime || (msg.timestamp ? new Date(msg.timestamp).getTime() : undefined) || sessionStartTimes[activeSessionId]} />
                        ) : msg.content ? (
                          <>
                            {/* Rich Markdown with Tables & Embedded Charts */}
                            <ChatMarkdown content={msg.content} attachedChart={msg.chart} />

                            {/* Collapsible Timeline of completed execution */}
                            {msg.progress && (
                              <ChatProgressTimeline isPending={false} progress={msg.progress} prompt={msg.prompt} startTime={msg.startTime} />
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 py-1" aria-label="Gabay is typing">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
                          </div>
                        )}

                        {msg.content && msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 border-t border-border/70 pt-2.5">
                            <p className="text-[11px] font-semibold text-muted-foreground">
                              Sources
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {msg.sources.map((s) => (
                                <span
                                  key={s.label}
                                  title={s.detail}
                                  className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2 py-1 text-[11px] font-semibold text-foreground"
                                >
                                  <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  <span className="truncate">{s.label}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {msg.content && (
                          <div className="mt-2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                              title="Copy response"
                            >
                              {copiedId === msg.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                              title="Good response"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                              title="Bad response"
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}

                {isExecuting && !activeConversation.messages.some((m) => m.isPending) && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground">
                      <Sparkles className="h-4 w-4 animate-spin" />
                    </div>
                    <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3">
                      <ChatProgressTimeline isPending={true} prompt={activeConversation.messages.filter((m) => m.role === 'user').slice(-1)[0]?.content} sessionId={activeSessionId} startTime={sessionStartTimes[activeSessionId]} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-border/70 bg-card">
          <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">


              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoGrow();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isExecuting
                    ? 'GABAY is processing your query...'
                    : 'Ask GABAY about students, subjects, scholarships, operations...'
                }
                rows={1}
                disabled={isExecuting}
                className="custom-scrollbar max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              />

              <div className="flex items-center gap-1.5 pb-0.5">
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isExecuting}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-primary-sm transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Send message"
                >
                  {isExecuting ? (
                    <Sparkles className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>RAG answers from school records</span>
              <span>Enter to send</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GabayRAGPage;
