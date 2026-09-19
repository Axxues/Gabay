import React, { useEffect, useRef } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import { HelpCircle, X, BookOpen, Mail, RefreshCw } from 'lucide-react';
import { ModalPortal, useModalAnimate } from '@/components/shared/ModalPortal';

export const HelpDrawer: React.FC = () => {
  const { isHelpDrawerOpen, setIsHelpDrawerOpen, logout, showAlert, showConfirm } = useLMS();
  const drawerRef = useRef<HTMLDivElement>(null);
  const { isClosing, startClose } = useModalAnimate(() => setIsHelpDrawerOpen(false), 220);

  useEffect(() => {
    if (!isHelpDrawerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        startClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHelpDrawerOpen, startClose]);

  if (!isHelpDrawerOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] overflow-hidden">
        {/* Backdrop Overlay */}
        <div
          className={`fixed inset-0 overlay-backdrop cursor-pointer ${
            isClosing ? 'animate-fade-out' : 'animate-fade-in'
          }`}
          onClick={() => startClose()}
          aria-label="Close help drawer"
        />

        {/* Slide-over Panel Container */}
        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
          <div
            ref={drawerRef}
            className={`w-screen max-w-md bg-card border-l border-border shadow-elevated flex flex-col h-full pointer-events-auto ${
              isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40 backdrop-blur-md">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-foreground">
                    Help & Support
                  </h2>
                  <p className="text-[10px] font-sans text-muted-foreground">
                    Academic Resources
                  </p>
                </div>
              </div>
              <button
                onClick={() => startClose()}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs text-muted-foreground">
              {/* Quick Links */}
              <div className="space-y-2">
                <h3 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                  Support & Guides
                </h3>
                <div className="space-y-2">
                  <a
                    href="#manual"
                    onClick={(e) => {
                      e.preventDefault();
                      showAlert({ title: "User Manual", message: "Opening GABAY User Manual PDF...", type: "info" });
                    }}
                    className="flex items-center space-x-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/60 transition-all text-foreground font-bold shadow-soft card-hover"
                  >
                    <BookOpen className="w-4 h-4 text-primary shrink-0" />
                    <span>User Manual</span>
                  </a>
                  <a
                    href="#support"
                    onClick={(e) => {
                      e.preventDefault();
                      showAlert({ title: "ICT Support", message: "Contacting ICT Helpdesk: it.support@dmmmsu.edu.ph", type: "info" });
                    }}
                    className="flex items-center space-x-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/60 transition-all text-foreground font-bold shadow-soft card-hover"
                  >
                    <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>ICT Helpdesk</span>
                  </a>
                </div>
              </div>

              {/* Sign Out */}
              <div className="pt-4 border-t border-border space-y-2.5">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                  Sign Out
                </h4>
                <p className="text-[11px]">
                  Sign out and clear the local session cache.
                </p>
                <button
                  onClick={() => {
                    showConfirm("Sign out and clear the local session cache?", () => {
                      logout();
                      startClose();
                      showAlert({ title: "Signed Out", message: "Session cleared successfully!", type: "success" });
                    }, "Sign Out");
                  }}
                  className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-primary-sm active:scale-[0.98] cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
