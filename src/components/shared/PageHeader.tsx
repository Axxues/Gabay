import React from 'react';
export const PageHeader: React.FC<{ title: string; description?: string; eyebrow?: string; actions?: React.ReactNode }> = ({ title, description, eyebrow, actions }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-border/70">
    <div className="min-w-0 max-w-2xl">
      {eyebrow && <div className="mb-1.5 text-[11px] font-bold tracking-wide text-primary">{eyebrow}</div>}
      <h1 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-foreground">{title}</h1>
      {description && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);
