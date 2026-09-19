import { useCallback, useEffect, useRef, useState } from 'react';

export function useSimulatedUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const start = useCallback((name: string) => {
    clearTimers();
    setIsUploading(true);
    setProgress(0);
    setFileName(name);
    timerRef.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        const remaining = 90 - prev;
        const step = Math.max(2, remaining * 0.12);
        return Math.min(90, Math.round(prev + step));
      });
    }, 90);
  }, [clearTimers]);

  const complete = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setProgress(100);
    resetTimerRef.current = window.setTimeout(() => {
      setIsUploading(false);
      setFileName(null);
    }, 400);
  }, []);

  const fail = useCallback(() => {
    clearTimers();
    setIsUploading(false);
    setProgress(0);
    setFileName(null);
  }, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setIsUploading(false);
    setProgress(0);
    setFileName(null);
  }, [clearTimers]);

  return { isUploading, progress, fileName, start, complete, fail, reset };
}
