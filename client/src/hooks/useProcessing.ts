import { useCallback, useRef, useState } from 'react';

/**
 * Tracks in-flight async actions by id so buttons/rows can show a loading
 * state and disable themselves while the DB request is processing.
 *
 * Prevents double-clicks on slow mutations (e.g. approve/reject enrollment
 * requests take ~2s: sequential per-id POSTs + cache update only on success).
 *
 * Usage:
 *   const { isProcessing, run, anyProcessing } = useProcessing();
 *   const busy = isProcessing(req.id);
 *   <button disabled={busy || anyProcessing} onClick={() => run(req.id, () => approve([req.id]))}>
 *     {busy ? <Loader2 className="animate-spin" /> : 'Approve'}
 *   </button>
 */
export function useProcessing() {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const idsRef = useRef<Set<string>>(new Set());

  const isProcessing = useCallback(
    (id: string) => processingIds.has(id),
    [processingIds],
  );

  const run = useCallback(async <T,>(id: string, fn: () => Promise<T>): Promise<T | undefined> => {
    if (idsRef.current.has(id)) return undefined;
    idsRef.current.add(id);
    setProcessingIds(new Set(idsRef.current));
    try {
      return await fn();
    } finally {
      idsRef.current.delete(id);
      setProcessingIds(new Set(idsRef.current));
    }
  }, []);

  return {
    processingIds,
    isProcessing,
    run,
    anyProcessing: processingIds.size > 0,
  };
}

/** Single boolean flag version for form submits / bulk actions. */
export function useBusyFlag() {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (busyRef.current) return undefined;
    busyRef.current = true;
    setBusy(true);
    try {
      return await fn();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  return { busy, run };
}
