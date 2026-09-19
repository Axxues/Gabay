import React, { useState } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import { ModalPortal } from '@/components/shared/ModalPortal';
import type { Announcement } from '@/services/lms/types/lms.types';
import {
  Plus,
  Pin,
  Heart,
  MessageSquare,
  Search,
  Paperclip,
  Send,
  Trash2,
  Lock,
  FileText,
  Eye,
  ExternalLink,
  ChevronDown,
  X
} from 'lucide-react';
import { isImageFile } from '@/utils/fileUploader';
import { groupRepliesByRoot } from '@/utils/threadReplies';
import { PageHeader } from '@/components/shared/PageHeader';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { EmptyState } from '@/components/shared/EmptyState';
import { CreateAnnouncementPage } from '@/features/assessments/pages/CreateAnnouncementPage';

interface AnnouncementsViewProps {
  courseId: string;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({ courseId }) => {
  const {
    activeUser,
    activeRole,
    db,
    isLoading,
    isSyncing,
    deleteAnnouncement,
    togglePinAnnouncement,
    toggleLikeAnnouncement,
    addAnnouncementReply,
    markAnnouncementRead,
    showConfirm
  } = useLMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);
  const [previewingAttachment, setPreviewingAttachment] = useState<{ name: string; size: string; url?: string } | null>(null);

  // Reply state for currently expanded thread
  const [replyText, setReplyText] = useState('');

  // Second-layer reply composer state per announcement (reply target id + draft text)
  const [replyToReplyIds, setReplyToReplyIds] = useState<Record<string, string | null>>({});
  const [childTexts, setChildTexts] = useState<Record<string, string>>({});

  // Pending flags for slow reply posts — show loading + block double-submit
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [postingChildIds, setPostingChildIds] = useState<Record<string, boolean>>({});

  const isImageFileName = (name: string, url?: string): boolean => {
    return isImageFile(name, undefined, url);
  };

  const getImageSrc = (file: { name: string; size?: string; url?: string }) => {
    if (file.url) return file.url;
    const encodedName = encodeURIComponent(file.name);
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340" fill="none"><rect width="600" height="340" rx="16" fill="%231e293b"/><circle cx="300" cy="130" r="44" fill="%23ec4899" fill-opacity="0.15"/><path d="M280 142l14-14 26 26 12-12 18 18H270l10-18z" fill="%23ec4899"/><circle cx="286" cy="120" r="6" fill="%23f472b6"/><text x="300" y="220" fill="%23f8fafc" font-size="15" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle">${encodedName}</text><text x="300" y="245" fill="%2394a3b8" font-size="12" font-family="system-ui, sans-serif" text-anchor="middle">Image Attachment</text></svg>`;
  };

  const course = db.courses.find(c => c.id === courseId);

  // One section per course: every enrolled viewer sees every announcement.
  const announcements = (db.announcements || []).filter(a => {
    if (a.courseId !== courseId && a.courseId !== 'all') return false;
    return true;
  });

  // Filtered announcements
  const filteredAnnouncements = announcements
    .filter(a => {
      const q = searchQuery.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      // Pinned first, then newest
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleSelectAnnouncement = (ann: Announcement) => {
    void markAnnouncementRead(ann.id).catch(() => {});
    setSelectedAnnouncementId(prev => (prev === ann.id ? null : ann.id));
  };

  const handleSendReply = async (announcementId: string) => {
    if (!replyText.trim() || isPostingReply) return;
    const text = replyText.trim();
    // Server notifies the announcement author inline.
    setIsPostingReply(true);
    try {
      await addAnnouncementReply(announcementId, text);
      setReplyText('');
    } catch {
      // Context already surfaced the failure alert.
    } finally {
      setIsPostingReply(false);
    }
  };

  const handlePostChildReply = async (announcementId: string) => {
    const text = (childTexts[announcementId] || '').trim();
    const targetId = replyToReplyIds[announcementId] ?? null;
    if (!text || !targetId || postingChildIds[announcementId]) return;
    setPostingChildIds(prev => ({ ...prev, [announcementId]: true }));
    try {
      await addAnnouncementReply(announcementId, text, targetId);
      setReplyToReplyIds(prev => ({ ...prev, [announcementId]: null }));
      setChildTexts(prev => ({ ...prev, [announcementId]: '' }));
    } catch {
      // Context already surfaced the failure alert.
    } finally {
      setPostingChildIds(prev => ({ ...prev, [announcementId]: false }));
    }
  };

  const canCreate = activeRole === 'faculty';

  if (isCreating) {
    return (
      <CreateAnnouncementPage
        courseId={courseId}
        onBack={() => setIsCreating(false)}
        onAnnouncementCreated={() => setIsCreating(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <PageHeader
        title="Announcements"
        description={`Broadcasts, academic directives, and time-sensitive reminders for ${course?.code || 'course'}.`}
        actions={
          <>
            <span className="px-2.5 py-0.5 text-[12px] font-sans font-medium tabular-nums rounded-full bg-muted text-muted-foreground border border-border">
              {filteredAnnouncements.length}
            </span>
            {canCreate && (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-primary-sm flex items-center space-x-2 cursor-pointer active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Announcement</span>
              </button>
            )}
          </>
        }
      />

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search announcements by title or keyword..."
            className="w-full pl-10 pr-4 py-2 bg-card border border-border focus:ring-2 focus:ring-primary/20 rounded-xl text-xs font-sans outline-none text-foreground shadow-subtle"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Feed List */}
      {(isLoading || isSyncing) && announcements.length === 0 ? (
        <div data-testid="announcements-loading" className="space-y-4" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`announcements-skeleton-${i}`} className="bg-card border border-border rounded-2xl p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-1/2 rounded bg-muted" />
                  <div className="h-3 w-1/4 rounded bg-muted/70" />
                </div>
              </div>
              <div className="h-3 w-full rounded bg-muted/70" />
              <div className="h-3 w-5/6 rounded bg-muted/70" />
            </div>
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <EmptyState
          title="No Announcements Found"
          body={
            searchQuery
              ? 'No announcements match your search query.'
              : 'There are no active announcements posted in this course yet.'
          }
          actionLabel={canCreate && !searchQuery ? '+ Post First Announcement' : undefined}
          onAction={canCreate && !searchQuery ? () => setIsCreating(true) : undefined}
        />
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((ann, idx) => {
            const isExpanded = selectedAnnouncementId === ann.id;
            const isRead = (ann.readBy || []).includes(activeUser.id);
            const userHasReplied = (ann.replies || []).some(r => r.authorId === activeUser.id);
            const isLiked = (ann.likedBy || []).includes(activeUser.id);
            const mustPostFirst =
              ann.usersMustPostBeforeReplies &&
              !userHasReplied &&
              activeRole === 'student';

            return (
              <div
                key={ann.id}
                style={{ '--i': Math.min(idx, 5) } as React.CSSProperties}
                className={`anim-stagger-item bg-card border border-border rounded-2xl transition-all hover:border-muted-foreground/25 hover:shadow-card overflow-hidden ${ann.pinned
                    ? 'border-muted-foreground/25'
                    : isRead
                      ? 'border-border'
                      : 'border-border'
                  }`}
              >
                {/* Announcement Summary Header */}
                <div
                  onClick={() => handleSelectAnnouncement(ann)}
                  className="p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start space-x-3.5">
                    <UserAvatar
                      name={ann.authorName}
                      src={ann.authorAvatar}
                      className="w-10 h-10 rounded-full object-cover border border-border shadow-soft shrink-0 mt-0.5"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h3 className="font-bold text-[14px] tracking-tight truncate text-foreground hover:text-primary transition-colors">
                          {ann.title}
                        </h3>
                        {ann.pinned && (
                          <span className="px-2 py-0.5 text-[11px] font-sans font-medium rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center space-x-1">
                            <Pin className="w-3 h-3" />
                            <span>Pinned</span>
                          </span>
                        )}
                        {!isRead && (
                          <span className="px-2 py-0.5 text-[11px] font-sans font-medium rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                            New
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-[12px] text-muted-foreground font-sans">
                        <span className="font-semibold text-foreground">{ann.authorName}</span>
                        <span>·</span>
                        <span>
                          {new Date(ann.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        {ann.delayedUntil && (
                          <span className="text-muted-foreground">
                            · Scheduled {new Date(ann.delayedUntil).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {!isExpanded && (
                        <p className="text-[12px] text-muted-foreground line-clamp-2 pt-1 font-sans">
                          {ann.content}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Action Stats */}
                  <div
                    className="flex items-center space-x-3 shrink-0 text-xs text-muted-foreground"
                    onClick={e => e.stopPropagation()}
                  >
                    {ann.allowLiking && (
                      <button
                        type="button"
                        onClick={() => {
                          void toggleLikeAnnouncement(ann.id).catch(() => {});
                        }}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${isLiked
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold'
                            : 'bg-muted/40 border-border hover:text-foreground'
                          }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                        <span>{ann.likes || 0}</span>
                      </button>
                    )}

                    <div className="flex items-center space-x-1 font-sans text-[11px] bg-muted px-2 py-1 rounded-full border border-border text-muted-foreground">
                      <MessageSquare className="w-3 h-3 text-muted-foreground" />
                      <span>{ann.replies?.length || 0}</span>
                    </div>

                    {canCreate && (
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            void togglePinAnnouncement(ann.id).catch(() => {});
                          }}
                          title={ann.pinned ? 'Unpin' : 'Pin to top'}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
                        >
                          <Pin className={`w-3.5 h-3.5 ${ann.pinned ? 'text-amber-500' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            showConfirm(
                              `Are you sure you want to delete "${ann.title}"?`,
                              () => {
                                void deleteAnnouncement(ann.id).catch(() => {});
                              },
                              'Delete Announcement'
                            )
                          }
                          title="Delete Announcement"
                          className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Expand/Collapse Chevron Indicator */}
                    <div className="pl-1">
                      <div className={`p-1.5 rounded-lg text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : 'rotate-0'}`}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Thread & Details with Opening and Closing Animations */}
                <div
                  className={`grid transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                >
                  <div className="overflow-hidden min-h-0">
                    <div className="p-5 pt-0 border-t border-border/80 space-y-5 bg-card/60">
                      {/* Full Content */}
                      <div className="pt-4 text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-line">
                        {ann.content}
                      </div>

                      {/* Attachments Section */}
                      {ann.attachments && ann.attachments.length > 0 && (() => {
                        const imageAttachments = ann.attachments.filter(f => isImageFileName(f.name, f.url));
                        const fileAttachments = ann.attachments.filter(f => !isImageFileName(f.name, f.url));

                        return (
                          <div className="space-y-4 pt-3 border-t border-border">
                            {/* Image Attachments - Immediately Visible */}
                            {imageAttachments.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
                                  <FileText className="w-3.5 h-3.5 text-primary" />
                                  <span>Attached Image ({imageAttachments.length})</span>
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {imageAttachments.map((imgFile, idx) => (
                                    <div
                                      key={idx}
                                      className="group relative rounded-2xl overflow-hidden border border-border bg-card/80 shadow-subtle hover:border-primary/50 transition-all cursor-pointer"
                                      onClick={() => setPreviewingAttachment(imgFile)}
                                    >
                                      <div className="bg-muted/30 p-2 flex items-center justify-center min-h-[180px] max-h-[360px] overflow-hidden">
                                        <img
                                          src={getImageSrc(imgFile)}
                                          alt={imgFile.name}
                                          className="w-full h-auto max-h-[340px] object-contain rounded-xl group-hover:scale-[1.01] transition-transform duration-200"
                                        />
                                      </div>
                                      <div className="p-3 bg-card border-t border-border flex items-center justify-between">
                                        <div className="flex items-center space-x-2 truncate">
                                          <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
                                          <span className="text-xs font-semibold text-foreground truncate">{imgFile.name}</span>
                                          <span className="text-[10px] text-muted-foreground shrink-0">({imgFile.size})</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewingAttachment(imgFile);
                                          }}
                                          className="px-2.5 py-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors flex items-center space-x-1 shrink-0 ml-2 cursor-pointer"
                                        >
                                          <Eye className="w-3 h-3" />
                                          <span>View</span>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Document/File Attachments - Clickable without downloading */}
                            {fileAttachments.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
                                  <Paperclip className="w-3.5 h-3.5 text-primary" />
                                  <span>Attached Documents & Handouts ({fileAttachments.length})</span>
                                </span>
                                <div className="flex flex-wrap gap-2.5">
                                  {fileAttachments.map((file, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setPreviewingAttachment(file)}
                                      className="px-3.5 py-2.5 bg-card hover:bg-muted/70 border border-border hover:border-primary/50 rounded-xl flex items-center space-x-3 text-xs font-sans text-foreground transition-all cursor-pointer shadow-subtle group text-left max-w-sm"
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <FileText className="w-4 h-4" />
                                      </div>
                                      <div className="overflow-hidden">
                                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate flex items-center space-x-1.5">
                                          <span className="truncate">{file.name}</span>
                                          <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 opacity-60 group-hover:opacity-100" />
                                        </div>
                                        <span className="text-muted-foreground text-[10px] block">{file.size} • Click to open & view</span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Replies Section */}
                      {ann.allowComments && (
                        <div className="pt-4 border-t border-border space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground font-sans uppercase tracking-wider flex items-center space-x-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-primary" />
                              <span>Discussion & Responses ({ann.replies?.length || 0})</span>
                            </span>
                          </div>

                          {/* If student must post before seeing replies */}
                          {mustPostFirst && (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center space-x-3 text-xs text-amber-800 dark:text-amber-300">
                              <Lock className="w-4 h-4 shrink-0" />
                              <span>
                                Peer responses are hidden until you post your initial reply. Submit a reply below to view all comments.
                              </span>
                            </div>
                          )}

                          {/* List of Replies */}
                          {!mustPostFirst && ann.replies && ann.replies.length > 0 && (() => {
                            // Hoisted per-announcement: computed once outside the per-row map.
                            const topReplies = (ann.replies || []).filter(r => !r.parentId);
                            const childGroups = groupRepliesByRoot(ann.replies || []);
                            const annReplyToId = replyToReplyIds[ann.id] ?? null;
                            const annChildText = childTexts[ann.id] ?? '';
                            const replyTarget = annReplyToId
                              ? (ann.replies || []).find(p => p.id === annReplyToId)
                              : undefined;
                            return (
                            <div className="space-y-3">
                              {[...topReplies]
                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                .map(rep => {
                                  const childThreads = childGroups.get(rep.id) || [];
                                  const showComposerHere = Boolean(annReplyToId) && (annReplyToId === rep.id || childThreads.some(ch => ch.id === annReplyToId));
                                  return (
                                  <div
                                    key={rep.id}
                                    className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <UserAvatar
                                          name={rep.authorName}
                                          src={rep.authorAvatar}
                                          className="w-6 h-6 rounded-full object-cover border border-border"
                                        />
                                        <span className="text-xs font-bold text-foreground">
                                          {rep.authorName}
                                        </span>
                                        <span className="px-2 py-0.5 text-[11px] font-sans font-medium rounded-full bg-muted text-muted-foreground border border-border">
                                          {rep.authorRole}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-sans text-muted-foreground">
                                        {new Date(rep.createdAt).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                    <p className="text-xs text-foreground pl-8">{rep.content}</p>
                                    <div className="flex items-center space-x-3 pl-8 pt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReplyToReplyIds(prev => ({ ...prev, [ann.id]: rep.id }));
                                          setChildTexts(prev => ({ ...prev, [ann.id]: '' }));
                                        }}
                                        className="text-[11px] font-bold font-sans text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                      >
                                        Reply
                                      </button>
                                    </div>

                                    {/* Second-layer thread: flattened children indented under the root */}
                                    {childThreads.map(child => {
                                      const direct = (ann.replies || []).find(p => p.id === child.parentId);
                                      const showMention = Boolean(direct && direct.id !== rep.id);
                                      return (
                                        <div key={child.id} className="ml-8 border-l border-border pl-3 space-y-1">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                              <UserAvatar
                                                name={child.authorName}
                                                src={child.authorAvatar}
                                                className="w-5 h-5 rounded-full object-cover border border-border shrink-0"
                                              />
                                              <span className="text-xs font-bold text-foreground">
                                                {child.authorName}
                                              </span>
                                              <span className="px-2 py-0.5 text-[11px] font-sans font-medium rounded-full bg-muted text-muted-foreground border border-border">
                                                {child.authorRole}
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-sans text-muted-foreground">
                                              {new Date(child.createdAt).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </span>
                                          </div>
                                          <p className="text-xs text-foreground pl-0">
                                            {showMention && <span className="font-bold text-primary">@{direct?.authorName} </span>}
                                            {child.content}
                                          </p>
                                          <div className="flex items-center space-x-3 pt-0.5">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setReplyToReplyIds(prev => ({ ...prev, [ann.id]: child.id }));
                                                setChildTexts(prev => ({ ...prev, [ann.id]: '' }));
                                              }}
                                              className="text-[11px] font-bold font-sans text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                            >
                                              Reply
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* Inline second-layer composer for this thread */}
                                    {showComposerHere && annReplyToId && (
                                      <div className="ml-8 border-l border-border pl-3 pt-1 space-y-2">
                                        <p className="text-[11px] font-sans text-muted-foreground">
                                          Reply to <span className="font-bold text-primary">@{replyTarget?.authorName ?? 'reply'}</span>
                                        </p>
                                        <div className="flex items-start space-x-2">
                                          <textarea
                                            rows={2}
                                            value={annChildText}
                                            onChange={e =>
                                              setChildTexts(prev => ({ ...prev, [ann.id]: e.target.value }))
                                            }
                                            onKeyDown={e => {
                                              if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                if (annChildText.trim() && replyToReplyIds[ann.id] && !postingChildIds[ann.id]) {
                                                  void handlePostChildReply(ann.id);
                                                }
                                              }
                                            }}
                                            placeholder="Write a reply... (Press Enter to send, Shift+Enter for new line)"
                                            className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-xs font-sans text-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                          />
                                          <div className="flex flex-col space-y-1.5 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                void handlePostChildReply(ann.id);
                                              }}
                                              disabled={!annChildText.trim() || postingChildIds[ann.id]}
                                              className="px-3 py-1.5 text-xs font-bold bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg transition-all cursor-pointer flex items-center space-x-1.5"
                                            >
                                              {postingChildIds[ann.id] ? (
                                                <span className="block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                              ) : null}
                                              <span>{postingChildIds[ann.id] ? 'Posting...' : 'Reply'}</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setReplyToReplyIds(prev => ({ ...prev, [ann.id]: null }));
                                                setChildTexts(prev => ({ ...prev, [ann.id]: '' }));
                                              }}
                                              className="px-3 py-1.5 text-muted-foreground hover:bg-muted text-xs font-bold font-sans rounded-lg transition-colors cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  );
                                })}
                            </div>
                            );
                          })()}

                          {/* Reply Composer Box */}
                          <div className="flex items-start space-x-2 pt-2">
                            <UserAvatar
                              name={activeUser.name}
                              src={activeUser.avatar}
                              className="w-8 h-8 rounded-full object-cover border border-border shrink-0 mt-1"
                            />
                            <div className="flex-1 space-y-2">
                              <textarea
                                rows={2}
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (replyText.trim()) {
                                      void handleSendReply(ann.id);
                                    }
                                  }
                                }}
                                placeholder="Type a response or inquiry... (Press Enter to send, Shift+Enter for new line)"
                                className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs font-sans text-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                              />
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => void handleSendReply(ann.id)}
                                  disabled={!replyText.trim() || isPostingReply}
                                  title={isPostingReply ? 'Posting...' : 'Post reply'}
                                  className="px-3.5 py-1.5 text-xs font-bold bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg transition-all shadow-primary-sm flex items-center space-x-1.5 cursor-pointer"
                                >
                                  {isPostingReply ? (
                                    <span className="block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                  <span>{isPostingReply ? 'Posting...' : 'Reply'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-App File / Handout Preview Modal */}
      {previewingAttachment && (
        <ModalPortal>
          <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-fade-in select-none">
            <div className="bg-card border border-border rounded-2xl w-[96vw] max-w-[1550px] h-[92vh] max-h-[95vh] shadow-elevated overflow-hidden animate-scale-in flex flex-col">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {isImageFileName(previewingAttachment.name, previewingAttachment.url) ? (
                      <Eye className="w-4.5 h-4.5" />
                    ) : (
                      <FileText className="w-4.5 h-4.5" />
                    )}
                  </div>
                  <div className="truncate">
                    <h3 className="text-sm font-bold text-foreground truncate font-sans">
                      {previewingAttachment.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-sans">
                      {previewingAttachment.size} • {isImageFileName(previewingAttachment.name, previewingAttachment.url) ? 'Image Preview (Expanded View)' : 'Document Handout Viewer (Expanded View)'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-4">
                  {previewingAttachment.url && (
                    <button
                      type="button"
                      onClick={() => {
                        const w = window.open();
                        if (w && previewingAttachment.url) {
                          w.location.href = previewingAttachment.url;
                        }
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer font-sans"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Open Original</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewingAttachment(null)}
                    className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body / Viewer */}
              <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-background/50 flex flex-col items-center justify-center min-h-0">
                {isImageFileName(previewingAttachment.name, previewingAttachment.url) ? (
                  <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 bg-muted/20 rounded-xl border border-border overflow-hidden">
                    <img
                      src={getImageSrc(previewingAttachment)}
                      alt={previewingAttachment.name}
                      className="max-w-full max-h-full object-contain rounded-xl shadow-elevated"
                    />
                  </div>
                ) : previewingAttachment.url && (previewingAttachment.url.startsWith('data:application/pdf') || previewingAttachment.url.includes('.pdf')) ? (
                  <iframe
                    src={previewingAttachment.url}
                    className="w-full h-full rounded-xl border border-border bg-white"
                    title={previewingAttachment.name}
                  />
                ) : (
                  <div className="w-full max-w-3xl bg-card border border-border rounded-2xl p-8 text-center space-y-6 shadow-subtle my-auto">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
                      <FileText className="w-10 h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-lg font-bold text-foreground font-sans">
                        {previewingAttachment.name}
                      </h4>
                      <p className="text-xs text-muted-foreground font-sans">
                        Official Document Handout • {previewingAttachment.size}
                      </p>
                    </div>

                    <div className="p-5 bg-muted/40 rounded-2xl border border-border text-left font-mono text-xs text-foreground/80 space-y-2 leading-relaxed">
                      <div className="text-[11px] font-sans font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Document Summary & Handout Preview
                      </div>
                      <p className="text-xs font-sans text-foreground">
                        Official course resource: <strong>{previewingAttachment.name}</strong>.
                      </p>
                      <p className="text-xs font-sans text-muted-foreground">
                        This handout is attached to the course announcement for academic review. Students and faculty can inspect details without needing external downloads.
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-3">
                      {previewingAttachment.url && (
                        <button
                          type="button"
                          onClick={() => {
                            const w = window.open();
                            if (w && previewingAttachment.url) {
                              w.location.href = previewingAttachment.url;
                            }
                          }}
                          className="px-5 py-2.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-primary-sm flex items-center space-x-2 cursor-pointer font-sans"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Open Document Stream</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPreviewingAttachment(null)}
                        className="px-5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer font-sans"
                      >
                        Close Viewer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default AnnouncementsView;
