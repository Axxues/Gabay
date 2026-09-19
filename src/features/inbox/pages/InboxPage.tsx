import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import {
  Send,
  Smile,
  ThumbsUp,
  Paperclip,
  Image as ImageIcon,
  Info,
  Search,
  Check,
  CheckCheck,
  X,
  Plus,
  FileText,
  Bell,
  BellOff,
  Palette,
  ArrowLeft,
  BookOpen,
  Users,
  UserPlus,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import type { Message, User, ChatGroup } from '@/services/lms/types/lms.types';
import { AnimatedModal } from '@/components/shared/ModalPortal';
import { UserAvatar } from '@/components/shared/UserAvatar';

// Messenger Theme Colors
const MESSENGER_THEMES = [
  { id: 'default', name: 'Messenger Blue', primaryClass: 'bg-blue-600 text-white', gradient: 'from-blue-600 to-indigo-600', bubbleBg: '#2563eb' },
  { id: 'pink', name: 'Berry Pink', primaryClass: 'bg-pink-600 text-white', gradient: 'from-pink-600 to-rose-500', bubbleBg: '#db2777' },
  { id: 'emerald', name: 'Emerald Green', primaryClass: 'bg-emerald-600 text-white', gradient: 'from-emerald-600 to-teal-500', bubbleBg: '#059669' },
  { id: 'purple', name: 'Violet Purple', primaryClass: 'bg-purple-600 text-white', gradient: 'from-purple-600 to-indigo-600', bubbleBg: '#7c3aed' },
  { id: 'sunset', name: 'Sunset Coral', primaryClass: 'bg-amber-600 text-white', gradient: 'from-amber-500 to-rose-500', bubbleBg: '#d97706' }
];

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏', '🙏', '💯'];

interface ConversationThread {
  id: string; // partnerId for DM, groupId for group
  isGroup: boolean;
  group?: ChatGroup;
  partner?: User;
  title: string;
  avatar?: string;
  subtitle: string;
  lastMessage: Message;
  messages: Message[];
  unreadCount: number;
}

export const InboxPage: React.FC = () => {
  const { activeUser, db, isLoading, isSyncing, sendMessage, createChatGroup, markThreadAsRead, toggleMessageReaction, showAlert } = useLMS();

  // Selected thread ID (either user ID for DM or group ID for Group Chat)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups' | 'faculty' | 'student'>('all');

  // Active Chat State
  const [inputText, setInputText] = useState('');
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);
  const [activeTheme, setActiveTheme] = useState(MESSENGER_THEMES[0]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ name: string; size: string } | null>(null);

  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  // Modals & Compose State
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeTab, setComposeTab] = useState<'direct' | 'group'>('direct');
  const [composeSearch, setComposeSearch] = useState('');
  
  // Group creation form state
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [groupMemberSearch, setGroupMemberSearch] = useState('');

  // Mobile View state
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Group messages into conversation threads
  const conversationThreads = useMemo(() => {
    const threadMap = new Map<string, Message[]>();

    // 1. Direct messages
    for (const msg of db.messages || []) {
      if (msg.isGroup || msg.groupId) continue;
      if (msg.senderId !== activeUser.id && msg.recipientId !== activeUser.id) continue;

      const partnerId = msg.senderId === activeUser.id ? msg.recipientId : msg.senderId;
      const list = threadMap.get(partnerId) || [];
      list.push(msg);
      threadMap.set(partnerId, list);
    }

    const threads: ConversationThread[] = [];

    // Add Direct Message Threads
    for (const [partnerId, msgs] of threadMap.entries()) {
      const partner = db.users.find(u => u.id === partnerId);
      if (!partner) continue;

      const sortedMsgs = [...msgs].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const lastMsg = sortedMsgs[sortedMsgs.length - 1];
      const unreadCount = sortedMsgs.filter(m => m.recipientId === activeUser.id && !m.read).length;

      threads.push({
        id: partner.id,
        isGroup: false,
        partner,
        title: partner.name,
        avatar: partner.avatar,
        subtitle: `${partner.role.toUpperCase()}${partner.department ? ` • ${partner.department}` : ''}`,
        lastMessage: lastMsg,
        messages: sortedMsgs,
        unreadCount
      });
    }

    // 2. Group Chat Threads
    const userGroups = (db.chatGroups || []).filter(g => g.memberIds.includes(activeUser.id));
    for (const group of userGroups) {
      const groupMsgs = (db.messages || [])
        .filter(m => (m.isGroup || m.groupId) && (m.groupId === group.id || m.recipientId === group.id))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const lastMsg: Message = groupMsgs.length > 0 ? groupMsgs[groupMsgs.length - 1] : {
        id: `msg-${group.id}-init`,
        senderId: group.createdBy,
        senderName: db.users.find(u => u.id === group.createdBy)?.name || 'Admin',
        senderRole: 'student',
        recipientId: group.id,
        recipientName: group.name,
        recipientRole: 'student',
        subject: group.name,
        body: `Group created. Welcome!`,
        timestamp: group.createdAt,
        read: true,
        isGroup: true,
        groupId: group.id
      };

      const unreadCount = groupMsgs.filter(m => m.senderId !== activeUser.id && !m.read).length;

      threads.push({
        id: group.id,
        isGroup: true,
        group,
        title: group.name,
        avatar: group.avatar,
        subtitle: `${group.memberIds.length} members${group.courseCode ? ` • ${group.courseCode}` : ''}`,
        lastMessage: lastMsg,
        messages: groupMsgs.length > 0 ? groupMsgs : [lastMsg],
        unreadCount
      });
    }

    // Sort by most recent message descending
    return threads.sort(
      (a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
    );
  }, [db.messages, db.chatGroups, db.users, activeUser.id]);

  // Set default selected thread on load
  useEffect(() => {
    if (!selectedThreadId && conversationThreads.length > 0) {
      setSelectedThreadId(conversationThreads[0].id);
    }
  }, [conversationThreads, selectedThreadId]);

  // Mark thread as read when selected
  useEffect(() => {
    if (selectedThreadId) {
      void markThreadAsRead(selectedThreadId).catch(() => {});
    }
  }, [selectedThreadId, db.messages?.length]);

  // Scroll to bottom when conversation changes or new message is added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedThreadId, db.messages?.length]);

  // Active selected thread details (falls back to a virtual empty DM thread
  // so "Start New Chat" opens the chatbox even with zero messages yet)
  const activeThread = useMemo(() => {
    if (!selectedThreadId) return null;
    const existing = conversationThreads.find(t => t.id === selectedThreadId);
    if (existing) return existing;
    const partner = db.users.find(u => u.id === selectedThreadId);
    if (!partner) return null;
    return {
      id: partner.id,
      isGroup: false,
      partner,
      title: partner.name,
      avatar: partner.avatar,
      subtitle: `${partner.role.toUpperCase()}${partner.department ? ` • ${partner.department}` : ''}`,
      lastMessage: {
        id: `pending-${partner.id}`,
        senderId: activeUser.id,
        senderName: activeUser.name,
        senderRole: activeUser.role,
        recipientId: partner.id,
        recipientName: partner.name,
        recipientRole: partner.role,
        subject: 'Direct Message',
        body: '',
        timestamp: new Date().toISOString(),
        read: true,
        isGroup: false,
      } as Message,
      messages: [] as Message[],
      unreadCount: 0,
    } as ConversationThread;
  }, [conversationThreads, selectedThreadId, db.users, activeUser.id, activeUser.name, activeUser.role]);

  const activePartner = activeThread?.partner || null;
  const activeGroup = activeThread?.group || null;

  // Filtered conversation list
  const filteredThreads = useMemo(() => {
    return conversationThreads.filter(t => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.lastMessage.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.lastMessage.subject.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'unread') return t.unreadCount > 0;
      if (activeFilter === 'groups') return t.isGroup;
      if (activeFilter === 'faculty') return !t.isGroup && t.partner?.role === 'faculty';
      if (activeFilter === 'student') return !t.isGroup && t.partner?.role === 'student';
      return true;
    });
  }, [conversationThreads, searchQuery, activeFilter]);

  // Allowed recipients for new direct message
  const allowedRecipients = useMemo(() => {
    return db.users
      .filter(u => u.id !== activeUser.id)
      .filter(u => {
        if (!composeSearch.trim()) return true;
        const q = composeSearch.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.department?.toLowerCase().includes(q)
        );
      });
  }, [db.users, activeUser.id, composeSearch]);

  // Potential members for group creation
  const potentialGroupMembers = useMemo(() => {
    return db.users
      .filter(u => u.id !== activeUser.id)
      .filter(u => {
        if (!groupMemberSearch.trim()) return true;
        const q = groupMemberSearch.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.department?.toLowerCase().includes(q)
        );
      });
  }, [db.users, activeUser.id, groupMemberSearch]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : inputText;
    if ((!text.trim() && !pendingAttachment) || !activeThread || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(
        activeThread.id,
        activeThread.isGroup ? activeThread.title : 'Direct Message',
        text.trim() || (pendingAttachment ? `Sent attachment: ${pendingAttachment.name}` : ''),
        activeThread.isGroup ? activeThread.group?.courseId : (activeThread.lastMessage.courseId || db.courses[0]?.id),
        pendingAttachment?.name,
        pendingAttachment?.size,
        activeThread.isGroup,
        activeThread.isGroup ? activeThread.id : undefined
      );

      setInputText('');
      setPendingAttachment(null);
      setShowEmojiPicker(false);
      inputRef.current?.focus();
    } catch {
      // Context already surfaced the alert; keep the draft intact.
    } finally {
      setIsSending(false);
    }
  };

  const handleSendThumbsUp = () => {
    void handleSendMessage('👍');
  };

  const handleToggleReaction = (msgId: string, emoji: string) => {
    void toggleMessageReaction(msgId, emoji).catch(() => {});
  };

  const handleStartDirectConversation = (partnerId: string) => {
    setSelectedThreadId(partnerId);
    void markThreadAsRead(partnerId).catch(() => {});
    setShowComposeModal(false);
    setComposeSearch('');
    setMobileChatOpen(true);
  };

  const handleToggleMemberSelection = (userId: string) => {
    setSelectedGroupMemberIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingGroup) return;
    if (!groupName.trim()) {
      showAlert('Please enter a group name.');
      return;
    }
    if (selectedGroupMemberIds.length === 0) {
      showAlert('Please select at least one member for the group.');
      return;
    }

    setIsCreatingGroup(true);
    try {
      const newGroup = await createChatGroup(
        groupName.trim(),
        selectedGroupMemberIds
      );

      setSelectedThreadId(newGroup.id);
      setShowComposeModal(false);
      setGroupName('');
      setSelectedGroupMemberIds([]);
      setGroupMemberSearch('');
      setMobileChatOpen(true);
      showAlert(`Group "${newGroup.name}" created successfully!`);
    } catch {
      // Context already surfaced the alert; keep the form intact.
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Format timestamps
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatThreadTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 3600);

    if (diffHours < 24 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    if (diffHours < 48) {
      return 'Yesterday';
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background font-sans">
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* ======================================================== */}
        {/* LEFT COLUMN: CHATS SIDEBAR (Messenger Style)             */}
        {/* ======================================================== */}
        <div
          className={`w-full md:w-80 lg:w-96 min-h-0 flex flex-col border-r border-border bg-card/60 backdrop-blur-md shrink-0 transition-all ${
            mobileChatOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Sidebar Top Header */}
          <div className="p-4 pb-3 space-y-3 border-b border-border/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <h1 className="text-[22px] font-extrabold text-foreground tracking-tight">
                  Inbox
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-muted text-muted-foreground border border-border tabular-nums">
                  {conversationThreads.length}
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(true)}
                  className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center cursor-pointer active:scale-95"
                  title="New message or group"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messenger Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search inbox..."
                className="w-full pl-9 pr-8 py-2 bg-muted/70 hover:bg-muted focus:bg-background border border-border/70 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-xs text-foreground placeholder:text-muted-foreground transition-all outline-none font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto custom-scrollbar pb-0.5 text-xs">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'unread', label: 'Unread' },
                  { id: 'groups', label: 'Groups' },
                  { id: 'faculty', label: 'Faculty' },
                  { id: 'student', label: 'Students' }
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeFilter === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {((isLoading || isSyncing) && conversationThreads.length === 0) ? (
              <div data-testid="inbox-loading" className="space-y-1 p-1" aria-hidden="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`inbox-skeleton-${i}`} className="flex items-center space-x-3 p-2.5 rounded-2xl animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-1/2 rounded bg-muted" />
                      <div className="h-3 w-3/4 rounded bg-muted/70" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-muted/80 flex items-center justify-center mx-auto text-muted-foreground">
                  <Search className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-foreground">No conversations found</p>
                <p className="text-[11px] text-muted-foreground">
                  {searchQuery ? 'Try searching for another keyword' : 'Start a new conversation or group chat'}
                </p>
              </div>
            ) : (
              filteredThreads.map(thread => {
                const isSelected = selectedThreadId === thread.id;
                const isSender = thread.lastMessage.senderId === activeUser.id;

                return (
                  <div
                    key={thread.id}
                    onClick={() => {
                      setSelectedThreadId(thread.id);
                      setMobileChatOpen(true);
                    }}
                    className={`flex items-center space-x-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-muted text-foreground border border-border ring-1 ring-primary/15'
                        : 'hover:bg-muted/70 text-foreground border border-transparent'
                    }`}
                  >
                    {/* Avatar Icon */}
                    <div className="relative shrink-0">
                      {thread.isGroup ? (
                        <div className="w-12 h-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center ring-1 ring-border">
                          <Users className="w-6 h-6" />
                        </div>
                      ) : (
                        <>
                          <UserAvatar
                            name={thread.title}
                            src={thread.avatar}
                            className="w-12 h-12 rounded-full object-cover ring-1 ring-border"
                          />
                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-card absolute bottom-0 right-0" />
                        </>
                      )}
                    </div>

                    {/* Chat Text Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs truncate text-foreground flex items-center space-x-1">
                          <span className="truncate">{thread.title}</span>
                          {thread.isGroup ? (
                            <span className="text-[11px] font-sans px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0 font-medium">
                              Group
                            </span>
                          ) : (
                            <span className="text-[11px] font-sans px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0 font-medium">
                              {thread.partner?.role}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-sans pl-1">
                          {formatThreadTime(thread.lastMessage.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <p
                          className={`truncate text-[11px] font-sans pr-2 ${
                            thread.unreadCount > 0 ? 'font-bold text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {isSender && <span className="text-primary font-medium">You: </span>}
                          {thread.isGroup && !isSender && thread.lastMessage.senderName && (
                            <span className="font-medium text-foreground/80">
                              {thread.lastMessage.senderName.split(' ')[0]}:{' '}
                            </span>
                          )}
                          {thread.lastMessage.body}
                        </p>

                        {thread.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center shrink-0 tabular-nums">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* CENTER COLUMN: ACTIVE CONVERSATION (Messenger Feed)      */}
        {/* ======================================================== */}
        <div
          className={`flex-1 min-h-0 min-w-0 flex flex-col bg-background/50 overflow-hidden ${
            !mobileChatOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeThread ? (
            <>
              {/* Messenger Active Chat Header */}
              <div className="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between shadow-none shrink-0">
                <div className="flex items-center space-x-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setMobileChatOpen(false)}
                    className="md:hidden p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    {activeThread.isGroup ? (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white shadow-soft ring-2 ring-primary/30">
                        <Users className="w-5 h-5" />
                      </div>
                    ) : (
                      <>
                        <UserAvatar
                          name={activePartner?.name || activeThread.title}
                          src={activePartner?.avatar}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30"
                        />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card absolute bottom-0 right-0" />
                      </>
                    )}
                  </div>

                  <div className="truncate">
                    <h2 className="text-sm font-bold text-foreground truncate flex items-center space-x-1.5">
                      <span>{activeThread.title}</span>
                      {activeThread.isGroup ? (
                        <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-primary/10 text-primary font-bold uppercase">
                          {activeGroup?.memberIds.length} Members
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-primary/10 text-primary font-bold uppercase">
                          {activePartner?.role}
                        </span>
                      )}
                    </h2>
                    <p className="text-[11px] font-sans text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-1">
                      {activeThread.isGroup ? (
                        <span className="text-muted-foreground font-normal">
                          {activeGroup?.courseCode ? `${activeGroup.courseCode} Study Group` : 'Gabay Group Chat'}
                        </span>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                          <span>Active now</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right Action Icons */}
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowDetailsPanel(prev => !prev)}
                    className={`p-2 rounded-full transition-colors cursor-pointer ${
                      showDetailsPanel
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    title="Conversation Details"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message Feed Stream */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {/* Chat Intro Header */}
                <div className="text-center py-6 space-y-2 border-b border-border/50 max-w-sm mx-auto">
                  {activeThread.isGroup ? (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white mx-auto ring-4 ring-primary/20 shadow-md">
                      <Users className="w-10 h-10" />
                    </div>
                  ) : (
                    <UserAvatar
                      name={activePartner?.name || activeThread.title}
                      src={activePartner?.avatar}
                      className="w-20 h-20 rounded-full object-cover mx-auto ring-4 ring-primary/20 shadow-md"
                    />
                  )}
                  <h3 className="font-extrabold text-base text-foreground">
                    {activeThread.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {activeThread.isGroup
                      ? `${activeGroup?.memberIds.length} Members • ${activeGroup?.courseCode || 'General Discussion'}`
                      : `${activePartner?.role.toUpperCase()} • ${activePartner?.department || 'DMMMSU-SLUC'}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground/80 font-sans">
                    {activeThread.isGroup
                      ? 'Messages in this group are visible to all members.'
                      : "You're connected on GABAY LMS Messenger."}
                  </p>
                </div>

                {/* Message Bubble Stream */}
                {activeThread.messages.map((msg, index) => {
                  const isSender = msg.senderId === activeUser.id;
                  const isThumbsUp = msg.body.trim() === '👍';
                  const currentReaction = msg.reaction;
                  
                  // In group, find sender user for avatar and name
                  const senderUser = db.users.find(u => u.id === msg.senderId);
                  const senderAvatar = isSender
                    ? activeUser.avatar
                    : (senderUser?.avatar || activePartner?.avatar);

                  const showAvatar =
                    !isSender &&
                    (index === activeThread.messages.length - 1 ||
                      activeThread.messages[index + 1]?.senderId !== msg.senderId);

                  return (
                    <div
                      key={msg.id}
                      onMouseEnter={() => setHoveredMessageId(msg.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                      className={`flex items-end gap-2 group ${isSender ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Left Avatar for Received Messages */}
                      {!isSender && (
                        <div className="w-7 h-7 shrink-0">
                          {showAvatar ? (
                            <UserAvatar
                              name={msg.senderName}
                              src={senderAvatar}
                              className="w-7 h-7 rounded-full object-cover ring-1 ring-border shadow-xs"
                            />
                          ) : (
                            <div className="w-7 h-7" />
                          )}
                        </div>
                      )}

                      {/* Chat Bubble & Floating Reactions */}
                      <div className="relative max-w-[75%] sm:max-w-[65%] space-y-1">
                        {/* Group Sender Name on incoming messages */}
                        {activeThread.isGroup && !isSender && (
                          <div className="text-[10px] font-bold text-muted-foreground ml-1 mb-0.5">
                            {msg.senderName}
                          </div>
                        )}

                        {/* Hover Quick Emoji Bar */}
                        {hoveredMessageId === msg.id && (
                          <div
                            className={`absolute -top-9 z-20 flex items-center space-x-1 bg-card/95 backdrop-blur-md border border-border rounded-full px-2 py-1 shadow-elevated animate-scale-in ${
                              isSender ? 'right-0' : 'left-0'
                            }`}
                          >
                            {QUICK_EMOJIS.slice(0, 6).map(emoji => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className="hover:scale-125 transition-transform text-sm cursor-pointer p-0.5"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Special Oversized Thumbs Up or Standard Bubble */}
                        {isThumbsUp ? (
                          <div className="p-1 animate-bounce-subtle cursor-pointer select-none">
                            <ThumbsUp className="w-10 h-10 text-primary fill-primary" />
                          </div>
                        ) : (
                          <div
                            className={`px-4 py-2.5 text-xs font-sans leading-relaxed transition-all shadow-2xs space-y-2 ${
                              isSender
                                ? `bg-gradient-to-r ${activeTheme.gradient} text-white rounded-2xl rounded-br-sm`
                                : 'bg-card hover:bg-card/90 text-foreground border border-border rounded-2xl rounded-bl-sm'
                            }`}
                          >
                            <p className="whitespace-pre-line">{msg.body}</p>

                            {/* Persistent Attachment Card */}
                            {msg.attachmentName && (
                              <div
                                className={`p-2 rounded-xl flex items-center space-x-2 border transition-all ${
                                  isSender
                                    ? 'bg-black/15 border-white/20 text-white'
                                    : 'bg-muted/80 border-border text-foreground'
                                }`}
                              >
                                <FileText className="w-4 h-4 shrink-0" />
                                <div className="truncate flex-1 min-w-0">
                                  <p className="font-bold text-[11px] truncate">{msg.attachmentName}</p>
                                  {msg.attachmentSize && (
                                    <p className="text-[9px] opacity-80">{msg.attachmentSize}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Attached Reaction Badge */}
                        {currentReaction && (
                          <div
                            className={`flex items-center ${isSender ? 'justify-end' : 'justify-start'}`}
                          >
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-card border border-border shadow-xs text-xs -mt-2.5 z-10 animate-scale-in">
                              {currentReaction}
                            </span>
                          </div>
                        )}

                        {/* Timestamp on hover */}
                        <div
                          className={`text-[9px] font-sans text-muted-foreground/80 px-1 ${
                            isSender ? 'text-right' : 'text-left'
                          }`}
                        >
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Seen status check for latest sent message */}
                {activeThread.messages.length ? (
                  <div className="flex justify-end items-center space-x-1 text-[10px] text-muted-foreground pr-1">
                    <CheckCheck className="w-3 h-3 text-primary" />
                    <span>Delivered</span>
                  </div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>

              {/* Messenger Bottom Chat Bar */}
              <div className="p-3 border-t border-border bg-card/80 backdrop-blur-md shrink-0 space-y-2">
                {/* Pending Attachment Preview Pill */}
                {pendingAttachment && (
                  <div className="flex items-center justify-between p-2 bg-primary/10 border border-primary/20 rounded-xl text-xs animate-scale-in">
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-bold text-foreground text-[11px] truncate">
                        {pendingAttachment.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-sans">
                        ({pendingAttachment.size})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingAttachment(null)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Emoji Quick Picker Dropdown */}
                {showEmojiPicker && (
                  <div className="p-2 mb-2 bg-card border border-border rounded-2xl shadow-elevated flex flex-wrap gap-1.5 animate-dropdown">
                    {QUICK_EMOJIS.map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => {
                          setInputText(prev => prev + e);
                          setShowEmojiPicker(false);
                          inputRef.current?.focus();
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-lg hover:scale-125 transition-transform cursor-pointer"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  {/* Left Action Buttons */}
                  <button
                    type="button"
                    onClick={() => {
                      setPendingAttachment({
                        name: `Lab_Activity_Output_${Date.now().toString().slice(-4)}.pdf`,
                        size: '1.8 MB'
                      });
                      inputRef.current?.focus();
                    }}
                    className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    title="Attach Document"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPendingAttachment({
                        name: `UI_Screenshot_${Date.now().toString().slice(-4)}.png`,
                        size: '950 KB'
                      });
                      inputRef.current?.focus();
                    }}
                    className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    title="Attach Screenshot"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  {/* Text Input Pill */}
                  <div className="flex-1 relative flex items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={activeThread.isGroup ? `Message ${activeThread.title}...` : 'Type a message...'}
                      className="w-full pl-4 pr-10 py-2.5 bg-muted/70 hover:bg-muted focus:bg-background border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-full text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all font-sans font-medium"
                    />

                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(prev => !prev)}
                      className="absolute right-3 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      title="Choose Emoji"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Send Button or Quick Thumbs Up */}
                  {inputText.trim() || pendingAttachment ? (
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={isSending}
                      className={`p-2.5 rounded-full ${activeTheme.primaryClass} hover:opacity-90 active:scale-95 shadow-none transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait`}
                      title={isSending ? 'Sending...' : 'Send Message'}
                    >
                      {isSending ? <span className="block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendThumbsUp}
                      className="p-2.5 rounded-full text-primary hover:bg-primary/10 active:scale-125 transition-all cursor-pointer"
                      title="Send Like"
                    >
                      <ThumbsUp className="w-5 h-5 fill-primary" />
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="m-auto text-center p-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-soft">
                <Send className="w-8 h-8" />
              </div>
              <h3 className="font-black text-lg text-foreground">Your Messages</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Send direct messages, collaborate in study group chats, or ask course questions to faculty and peers.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setComposeTab('direct');
                    setShowComposeModal(true);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-none transition-all cursor-pointer"
                >
                  Start New Chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setComposeTab('group');
                    setShowComposeModal(true);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl shadow-none transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>Create Group</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: CONVERSATION DETAILS (Messenger Panel)     */}
        {/* ======================================================== */}
        {showDetailsPanel && activeThread && (
          <div className="hidden xl:flex w-72 2xl:w-80 min-h-0 flex-col border-l border-border bg-card/60 backdrop-blur-md overflow-y-auto custom-scrollbar p-4 space-y-5 shrink-0">
            {/* Header Profile / Group Summary */}
            <div className="text-center space-y-2 pt-2">
              <div className="relative inline-block">
                {activeThread.isGroup ? (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white mx-auto shadow-md ring-4 ring-primary/20">
                    <Users className="w-10 h-10" />
                  </div>
                ) : (
                  <>
                    <UserAvatar
                      name={activePartner?.name || activeThread.title}
                      src={activePartner?.avatar}
                      className="w-20 h-20 rounded-full object-cover ring-4 ring-primary/20 mx-auto shadow-md"
                    />
                    <span className="w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-card absolute bottom-0 right-1 shadow-xs" />
                  </>
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-foreground">{activeThread.title}</h3>
                <p className="text-[11px] font-sans text-muted-foreground">
                  {activeThread.isGroup
                    ? `${activeGroup?.memberIds.length} Members • ${activeGroup?.courseCode || 'General Discussion'}`
                    : `${activePartner?.role.toUpperCase()} • ${activePartner?.department || 'SLUC Faculty'}`}
                </p>
                {!activeThread.isGroup && (
                  <p className="text-[10px] font-sans text-muted-foreground/80 mt-0.5">
                    {activePartner?.email || `${activePartner?.name.toLowerCase().replace(/\s+/g, '.')}@dmmmsu.edu.ph`}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex justify-center items-center space-x-6 pt-1 pb-3 border-b border-border/60">
              <button
                type="button"
                onClick={() => setIsMuted(prev => !prev)}
                className="flex flex-col items-center space-y-1 text-muted-foreground hover:text-foreground cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full bg-muted group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-colors">
                  {isMuted ? <BellOff className="w-4 h-4 text-rose-500" /> : <Bell className="w-4 h-4" />}
                </div>
                <span className="text-[10px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              <button
                type="button"
                onClick={() => showAlert(`Search in conversation with ${activeThread.title}`)}
                className="flex flex-col items-center space-y-1 text-muted-foreground hover:text-foreground cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full bg-muted group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-colors">
                  <Search className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-medium">Search</span>
              </button>
            </div>

            {/* Group Members Section (When Group Chat is active) */}
            {activeThread.isGroup && activeGroup && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Group Members ({activeGroup.memberIds.length})</span>
                  </span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
                  {activeGroup.memberIds.map(memId => {
                    const member = db.users.find(u => u.id === memId);
                    if (!member) return null;
                    const isCreator = member.id === activeGroup.createdBy;
                    const isMe = member.id === activeUser.id;

                    return (
                      <div
                        key={memId}
                        className="flex items-center justify-between p-1.5 rounded-xl hover:bg-muted/50 transition-colors text-xs"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <UserAvatar
                            name={member.name}
                            src={member.avatar}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-border shrink-0"
                          />
                          <div className="truncate">
                            <p className="font-bold text-[11px] text-foreground truncate">
                              {member.name} {isMe && <span className="text-primary font-normal">(You)</span>}
                            </p>
                            <p className="text-[9px] text-muted-foreground uppercase">{member.role}</p>
                          </div>
                        </div>

                        {isCreator && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center space-x-0.5 shrink-0">
                            <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                            Admin
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chat Theme Customization */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
                <Palette className="w-3.5 h-3.5" />
                <span>Chat Theme</span>
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {MESSENGER_THEMES.map(theme => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setActiveTheme(theme)}
                    className={`h-7 rounded-xl transition-all cursor-pointer flex items-center justify-center bg-gradient-to-r ${
                      theme.gradient
                    } ${activeTheme.id === theme.id ? 'ring-2 ring-primary ring-offset-2 scale-105' : 'hover:opacity-90'}`}
                    title={theme.name}
                  >
                    {activeTheme.id === theme.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Course Context Information */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Course Context</span>
              </span>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-1">
                <div className="text-xs font-bold text-foreground">
                  {db.courses[0]?.code} • {db.courses[0]?.title}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Section {db.courses[0]?.section} • 2nd Semester 2026
                </p>
              </div>
            </div>

            {/* Shared Files & Handouts */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Shared Handouts & Files</span>
              </span>
              <div className="space-y-1.5">
                {[
                  { name: 'Lab1_Rubric_Feedback.pdf', size: '1.2 MB' },
                  { name: 'Syllabus_CMSC131.pdf', size: '2.4 MB' }
                ].map((f, i) => (
                  <div
                    key={i}
                    className="p-2 bg-muted/30 hover:bg-muted/60 border border-border/60 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate font-medium text-[11px]">{f.name}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground shrink-0">{f.size}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* COMPOSE NEW CHAT / CREATE GROUP MODAL                    */}
      {/* ======================================================== */}
      <AnimatedModal
        isOpen={showComposeModal}
        onClose={() => setShowComposeModal(false)}
        panelClassName="w-full max-w-lg bg-card border border-border rounded-2xl p-6 space-y-4 shadow-elevated"
      >
        {({ startClose }) => (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-foreground">
                  {composeTab === 'direct' ? 'New Direct Message' : 'Create New Group Chat'}
                </h3>
              </div>
              <button
                type="button"
                onClick={startClose}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="flex bg-muted/70 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setComposeTab('direct')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  composeTab === 'direct'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Direct Message</span>
              </button>
              <button
                type="button"
                onClick={() => setComposeTab('group')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  composeTab === 'group'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Create Group</span>
              </button>
            </div>

            {/* DIRECT MESSAGE TAB CONTENT */}
            {composeTab === 'direct' && (
              <div className="space-y-3">
                {/* Recipient Search Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground">To:</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                    <input
                      type="text"
                      autoFocus
                      value={composeSearch}
                      onChange={e => setComposeSearch(e.target.value)}
                      placeholder="Search faculty, students, or staff by name..."
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-xs text-foreground outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Contact List to Pick */}
                <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Suggested Contacts
                  </span>
                  {allowedRecipients.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No contacts found matching "{composeSearch}"
                    </div>
                  ) : (
                    allowedRecipients.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleStartDirectConversation(u.id)}
                        className="w-full flex items-center space-x-3 p-2 rounded-xl hover:bg-muted transition-colors text-left cursor-pointer group"
                      >
                        <div className="relative shrink-0">
                          <UserAvatar
                            name={u.name}
                            src={u.avatar}
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-border"
                          />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card absolute bottom-0 right-0" />
                        </div>
                        <div className="truncate flex-1">
                          <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                            {u.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-sans truncate">
                            {u.role.toUpperCase()} • {u.department || 'SLUC Academic Dept'}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* CREATE GROUP TAB CONTENT */}
            {composeTab === 'group' && (
              <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
                {/* Group Name */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Group Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      autoFocus
                      required
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      placeholder="e.g. CMSC 131 Lab Project Team, Thesis Cohort..."
                      className="w-full px-3 py-2 bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-xs text-foreground outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Selected Members Chips */}
                {selectedGroupMemberIds.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Selected Members ({selectedGroupMemberIds.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar p-1.5 bg-muted/40 rounded-xl border border-border/60">
                      {selectedGroupMemberIds.map(memId => {
                        const user = db.users.find(u => u.id === memId);
                        if (!user) return null;
                        return (
                          <span
                            key={memId}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-bold border border-primary/20"
                          >
                            <UserAvatar
                              name={user.name}
                              src={user.avatar}
                              className="w-4 h-4 rounded-full object-cover"
                            />
                            <span>{user.name.split(' ')[0]}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleMemberSelection(memId)}
                              className="hover:text-rose-500 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Member Search & Selection Checkboxes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-muted-foreground">
                      Select Members <span className="text-rose-500">*</span>
                    </label>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={groupMemberSearch}
                      onChange={e => setGroupMemberSearch(e.target.value)}
                      placeholder="Search members to add..."
                      className="w-full pl-9 pr-3 py-1.5 bg-background border border-border focus:border-primary rounded-xl text-xs text-foreground outline-none font-medium"
                    />
                  </div>

                  <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-0.5 border border-border/60 rounded-xl p-1.5 bg-muted/20">
                    {potentialGroupMembers.map(u => {
                      const isSelected = selectedGroupMemberIds.includes(u.id);

                      return (
                        <div
                          key={u.id}
                          onClick={() => handleToggleMemberSelection(u.id)}
                          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/70 text-foreground'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate">
                            <UserAvatar
                              name={u.name}
                              src={u.avatar}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-border"
                            />
                            <div className="truncate">
                              <p className="font-bold text-xs truncate">{u.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {u.role.toUpperCase()} • {u.department || 'SLUC Dept'}
                              </p>
                            </div>
                          </div>

                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by div container
                            className="w-4 h-4 text-primary rounded border-border focus:ring-primary cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Submit Button */}
                <div className="pt-2 border-t border-border flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={startClose}
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!groupName.trim() || selectedGroupMemberIds.length === 0 || isCreatingGroup}
                    className="px-5 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait flex items-center space-x-1.5"
                  >
                    {isCreatingGroup ? <span className="block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    <span>{isCreatingGroup ? 'Creating...' : 'Create Group Chat'}</span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </AnimatedModal>
    </div>
  );
};

export default InboxPage;
