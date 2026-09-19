import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Layers, BookOpen, PenLine } from 'lucide-react';
import type { AssessmentSourceFilter } from '@/utils/assessmentSource';

interface SourceOption {
  value: AssessmentSourceFilter;
  label: string;
  isAll?: boolean;
}

const OPTIONS: SourceOption[] = [
  { value: 'all', label: 'All sources', isAll: true },
  { value: 'module', label: 'From Module' },
  { value: 'direct', label: 'Direct' },
];

function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
}

function SourceIcon({ value, className }: { value: AssessmentSourceFilter; className: string }) {
  if (value === 'module') return <BookOpen className={className} aria-hidden="true" />;
  if (value === 'direct') return <PenLine className={className} aria-hidden="true" />;
  return <Layers className={className} aria-hidden="true" />;
}

export const SourceFilterSelect: React.FC<{
  value: AssessmentSourceFilter;
  onChange: (v: AssessmentSourceFilter) => void;
  id?: string;
  prefixLabel?: string;
}> = ({ value, onChange, id = 'source-filter-select', prefixLabel = 'Source:' }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useDismiss(open, () => setOpen(false));
  const selected = OPTIONS.find(o => o.value === value) ?? OPTIONS[0];

  if (!selected) return null;

  return (
    <div className="flex items-center gap-2 bg-muted/40 pl-3 pr-1.5 py-1.5 rounded-xl border border-border">
      <span className="text-[12px] font-semibold text-muted-foreground select-none">{prefixLabel}</span>
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Filter by source: ${selected.label}`}
          onClick={() => setOpen(prev => !prev)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className={`flex items-center justify-between gap-2 min-w-[132px] pl-2.5 pr-2 py-1 bg-background border rounded-lg text-[12.5px] font-semibold text-foreground outline-none cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-primary/30 ${
            open ? 'border-primary/50 ring-2 ring-primary/20' : 'border-border hover:border-primary/30'
          }`}
        >
          <span className="flex items-center gap-1.5 truncate">
            <SourceIcon value={selected.value} className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{selected.label}</span>
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-primary' : 'text-muted-foreground'}`}
            aria-hidden="true"
          />
        </button>

        {open && (
          <div
            role="listbox"
            aria-labelledby={id}
            className="absolute left-0 top-full mt-1.5 min-w-full w-max max-w-[220px] bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-elevated p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            {OPTIONS.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChange(opt.value);
                      setOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-[12.5px] transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-bold border-primary/20'
                      : 'hover:bg-muted/60 text-foreground border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <SourceIcon value={opt.value} className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="font-semibold truncate">{opt.label}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
