import React from 'react';

interface PageTransitionProps {
  pageKey: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Keyed enter animation for navigation switches.
 * Enter-only by design: on key change the new view mounts immediately with
 * anim-page-enter. A fade-to-blank exit phase was tried here and caused a
 * visible blink (old view fading to transparent, then a gap before the new
 * view faded in — worsened by timer restarts on re-render), so exits were
 * removed. Disappear animations still exist on overlays (AnimatedModal,
 * drawers, dropdowns). Reduced-motion handled globally in CSS.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ pageKey, children, className }) => {
  return (
    <div key={pageKey} className={`min-h-0 min-w-0 ${className ?? ''} anim-page-enter`}>
      {children}
    </div>
  );
};
