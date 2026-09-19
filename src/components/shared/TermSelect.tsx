import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Layers } from 'lucide-react';
import type { TermId } from '@/utils/gradingTerms';

export const TERM_LABELS: Record<TermId, string> = { prelim: 'Prelim', midterm: 'Midterm', finals: 'Finals' };

export type TermFilterValue = TermId | 'all';

const TERM_DOT: Record<TermId, string> = {
  prelim: 'bg-sky-500',
  midterm: 'bg-amber-500',
  finals: 'bg-emerald-500',
};

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

interface OptionDef<T extends string> {
  value: T;
  label: string;
  dotClass?: string;
  isAll?: boolean;
}

function TermPicker<T extends string>({
  id,
  label,
  options,
  value,
  onChange,
  prefixLabel = 'Term:',
}: {
  id: string;
  label: string;
  options: OptionDef<T>[];
  value: T;
  onChange: (v: T) => void;
  prefixLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useDismiss(open, () => setOpen(false));
  const selected = options.find(o => o.value === value) ?? options[0];

  if (!selected) return null;

  // Single option: no dropdown chrome, just a quiet badge.
  if (options.length <= 1) {
    return (
      <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-xl border border-border">
        <span className="text-[12px] font-semibold text-muted-foreground select-none">{prefixLabel}</span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-background border border-border rounded-lg text-[12.5px] font-semibold text-foreground">
          {selected.dotClass && <span className={`w-1.5 h-1.5 rounded-full ${selected.dotClass}`} aria-hidden="true" />}
          {selected.label}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-muted/40 pl-3 pr-1.5 py-1.5 rounded-xl border border-border">
      <span className="text-[12px] font-semibold text-muted-foreground select-none">{prefixLabel}</span>
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${label}: ${selected.label}`}
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
            {selected.isAll ? (
              <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
            ) : (
              selected.dotClass && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected.dotClass}`} aria-hidden="true" />
              )
            )}
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
            {options.map(opt => {
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
                    {opt.isAll ? (
                      <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                    ) : (
                      opt.dotClass && (
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${opt.dotClass}`} aria-hidden="true" />
                      )
                    )}
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
}

export const TermSelect: React.FC<{ terms: TermId[]; value: TermId; onChange: (t: TermId) => void; id?: string }> = ({
  terms,
  value,
  onChange,
  id = 'term-select',
}) => {
  const safeValue: TermId = terms.includes(value) ? value : (terms[0] ?? 'midterm');
  return (
    <TermPicker<TermId>
      id={id}
      label="Grading term"
      prefixLabel="Term:"
      value={safeValue}
      onChange={t => {
        if (terms.includes(t)) onChange(t);
      }}
      options={terms.map(t => ({ value: t, label: TERM_LABELS[t], dotClass: TERM_DOT[t] }))}
    />
  );
};

export const TermFilterSelect: React.FC<{
  value: TermFilterValue;
  onChange: (v: TermFilterValue) => void;
  id?: string;
  prefixLabel?: string;
  allLabel?: string;
  terms?: TermId[];
}> = ({ value, onChange, id = 'term-filter-select', prefixLabel = 'Term:', allLabel = 'All terms', terms }) => {
  const visibleTerms: TermId[] = terms && terms.length > 0 ? terms : ['prelim', 'midterm', 'finals'];
  const safeValue: TermFilterValue = value === 'all' || visibleTerms.includes(value) ? value : 'all';
  return (
    <TermPicker<TermFilterValue>
      id={id}
      label="Filter by term"
      prefixLabel={prefixLabel}
      value={safeValue}
      onChange={onChange}
      options={[
        { value: 'all' as TermFilterValue, label: allLabel, isAll: true },
        ...visibleTerms.map(t => ({
          value: t as TermFilterValue,
          label: TERM_LABELS[t],
          dotClass: TERM_DOT[t],
        })),
      ]}
    />
  );
};
