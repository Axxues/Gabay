import React from 'react';
import { X } from 'lucide-react';
export const DialogFrame: React.FC<{ title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }> = ({ title, subtitle, onClose, children, footer, wide }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
    <div role="dialog" aria-modal="true" className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl border border-border bg-card shadow-elevated animate-scale-in`} onClick={e => e.stopPropagation()}>
      <div className="flex items-start justify-between border-b border-border p-5"><div><h2 className="text-sm font-extrabold text-foreground">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}</div><button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button></div>
      <div className="max-h-[60vh] overflow-y-auto p-5 custom-scrollbar">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-border p-4">{footer}</div>}
    </div>
  </div>
);
