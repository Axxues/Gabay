import React from 'react';
export const ListRow: React.FC<{ left: React.ReactNode; meta?: string; right?: React.ReactNode; onClick?: () => void }> = ({ left, meta, right, onClick }) => (
  <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-soft hover:border-primary/40 cursor-pointer">
    <div className="min-w-0"><div className="truncate text-xs font-bold text-foreground">{left}</div>{meta && <div className="truncate text-[11px] text-muted-foreground">{meta}</div>}</div>
    {right && <div className="shrink-0">{right}</div>}
  </button>
);
