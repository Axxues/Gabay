import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

/**
 * Portals modals and dialogs directly to document.body so they escape
 * any parent stacking contexts, filters, transforms, or overflow containers.
 * This guarantees the backdrop blurs the entire screen, including Topbar, rail and context panel.
 */
export const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(children, document.body);
};

export interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode | ((props: { startClose: () => void; isClosing: boolean }) => React.ReactNode);
  panelClassName?: string;
  backdropClassName?: string;
  containerClassName?: string;
  variant?: 'center' | 'drawer';
  duration?: number;
}

/**
 * AnimatedModal wraps ModalPortal with synchronized entrance and exit animations.
 * When closing (via backdrop click, Escape key, or startClose), it applies:
 * - Backdrop: animate-fade-out
 * - Panel: animate-scale-out (center) or animate-slide-out-right (drawer)
 * After duration (default 200ms), it cleanly notifies onClose and unmounts.
 */
export const AnimatedModal: React.FC<AnimatedModalProps> = ({
  isOpen,
  onClose,
  children,
  panelClassName = 'w-full max-w-lg bg-card border border-border rounded-2xl shadow-elevated p-6 space-y-4 z-10',
  backdropClassName = 'overlay-backdrop',
  containerClassName,
  variant = 'center',
  duration = 200,
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClosingRef = useRef(false);
  isClosingRef.current = isClosing;

  const startClose = useCallback(() => {
    if (isClosingRef.current) return;
    setIsClosing(true);
    isClosingRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
      isClosingRef.current = false;
      onClose();
    }, duration);
  }, [onClose, duration]);

  useEffect(() => {
    if (isOpen) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setShouldRender(true);
      setIsClosing(false);
      isClosingRef.current = false;
    } else if (shouldRender && !isClosingRef.current) {
      setIsClosing(true);
      isClosingRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
        isClosingRef.current = false;
      }, duration);
    }
  }, [isOpen, duration, shouldRender]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!shouldRender || isClosing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        startClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shouldRender, isClosing, startClose]);

  if (!shouldRender) return null;

  const backdropAnim = isClosing ? 'animate-fade-out' : 'animate-fade-in';
  const panelAnim = variant === 'drawer'
    ? (isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right')
    : (isClosing ? 'animate-scale-out' : 'animate-scale-in');

  return (
    <ModalPortal>
      <div className={containerClassName || (variant === 'drawer'
        ? "fixed inset-0 z-[100] overflow-hidden"
        : "fixed inset-0 z-[100] overflow-hidden flex items-center justify-center p-4")}>
        {/* Backdrop Overlay */}
        <div
          className={`fixed inset-0 cursor-pointer ${backdropClassName} ${backdropAnim}`}
          onClick={startClose}
        />

        {variant === 'drawer' ? (
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
            <div
              className={`${panelClassName} ${panelAnim} pointer-events-auto`}
              onClick={e => e.stopPropagation()}
            >
              {typeof children === 'function' ? children({ startClose, isClosing }) : children}
            </div>
          </div>
        ) : (
          <div
            className={`${panelClassName} ${panelAnim}`}
            onClick={e => e.stopPropagation()}
          >
            {typeof children === 'function' ? children({ startClose, isClosing }) : children}
          </div>
        )}
      </div>
    </ModalPortal>
  );
};

export { useModalAnimate } from '@/hooks/useModalAnimate';
