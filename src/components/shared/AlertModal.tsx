import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { ModalPortal, useModalAnimate } from '@/components/shared/ModalPortal';

export interface AlertModalOptions {
  title: string;
  message: React.ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  duration?: number;
}

interface AlertModalProps {
  isOpen: boolean;
  options: AlertModalOptions | null;
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({ isOpen, options, onClose }) => {
  const { isClosing, startClose } = useModalAnimate(onClose);
  const [progress, setProgress] = useState(100);

  const isConfirm = options?.type === 'confirm' || Boolean(options?.onCancel) || Boolean(options?.cancelText);

  // Auto-dismiss for brief notifications (upper right toast)
  useEffect(() => {
    if (!isOpen || !options || isConfirm) return;

    const duration = options.duration || 3200;
    const intervalTime = 40;
    const step = (intervalTime / duration) * 100;

    setProgress(100);
    const progressTimer = setInterval(() => {
      setProgress(prev => Math.max(0, prev - step));
    }, intervalTime);

    const timer = setTimeout(() => {
      startClose();
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, [isOpen, options, isConfirm, startClose]);

  if (!isOpen || !options) return null;

  const {
    title,
    message,
    type = 'info',
    confirmText = 'OK',
    cancelText = 'Cancel',
    onConfirm,
    onCancel
  } = options;

  const handleConfirm = () => {
    startClose(() => {
      if (onConfirm) {
        onConfirm();
      }
    });
  };

  const handleCancel = () => {
    startClose(() => {
      if (onCancel) {
        onCancel();
      }
    });
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'confirm':
        return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-primary" />;
    }
  };

  // 1. Brief Toast Notification on Upper-Right of screen
  if (!isConfirm) {
    return (
      <ModalPortal>
        <div className="fixed top-5 right-5 z-[200] max-w-sm w-full pointer-events-none px-3 sm:px-0 animate-fade-in">
          <div
            className={`pointer-events-auto bg-card/95 backdrop-blur-md border border-border rounded-2xl p-4 shadow-elevated overflow-hidden transition-all duration-300 relative ${
              isClosing ? 'opacity-0 -translate-y-2 scale-95' : 'translate-y-0 opacity-100 scale-100'
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-3 min-w-0">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : type === 'error'
                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      : type === 'warning'
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : 'bg-primary/10 text-primary border border-primary/20'
                  }`}
                >
                  {getIcon()}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h4 className="text-sm font-bold text-foreground leading-snug font-sans truncate">
                    {title}
                  </h4>
                  <div className="text-xs text-muted-foreground leading-relaxed mt-0.5 font-sans break-words">
                    {message}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => startClose()}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subtle auto-dismiss progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  type === 'success'
                    ? 'bg-emerald-500'
                    : type === 'error'
                    ? 'bg-rose-500'
                    : type === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-primary'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  }

  // 2. Confirmation Modal (Center of screen for destructive/confirm user actions)
  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center p-4 overlay-backdrop ${
          isClosing ? 'animate-fade-out' : 'animate-fade-in'
        }`}
        onClick={handleCancel}
      >
        <div
          className={`w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-elevated space-y-4 ${
            isClosing ? 'animate-scale-out' : 'animate-scale-in'
          }`}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-muted shrink-0">
                {getIcon()}
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground leading-tight font-sans">
                  {title}
                </h3>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-1 font-sans">
            {message}
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer font-sans"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary-sm transition-all cursor-pointer active:scale-[0.98] font-sans"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
