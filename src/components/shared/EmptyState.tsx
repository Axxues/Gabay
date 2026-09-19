import React from 'react';
import { Inbox } from 'lucide-react';
export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; body?: string; actionLabel?: string; onAction?: () => void }> = ({ icon, title, body, actionLabel, onAction }) => (
  <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 sm:p-12 text-center">
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted border border-border text-muted-foreground">{icon ?? <Inbox className="h-5 w-5" />}</div>
    <h4 className="text-[14px] font-bold tracking-tight text-foreground">{title}</h4>
    {body && <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">{body}</p>}
    {actionLabel && onAction && <button type="button" onClick={onAction} className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-primary-sm hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer">{actionLabel}</button>}
  </div>
);
