import React, { useEffect, useState } from 'react';
import { avatarBackground, getInitials, hasCustomAvatar } from '@/utils/avatar';

interface UserAvatarProps {
  name: string;
  src?: string | null;
  className?: string;
}

/**
 * User avatar with initial-letter fallback. Shows the uploaded photo when
 * the user has one; otherwise a colored box with the first letter of
 * the name (legacy stock photo urls count as "no photo"). If a custom
 * photo fails to load (stale/missing file), it degrades to initials
 * instead of a broken-image icon.
 * Sizing/rounding come from className (e.g. "w-8 h-8 rounded-full ...").
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({ name, src, className = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (hasCustomAvatar(src) && !failed) {
    return (
      <img
        src={src as string}
        alt={name}
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={name}
      title={name}
      style={{ backgroundColor: avatarBackground(name) }}
      className={`avatar-box flex items-center justify-center overflow-hidden shrink-0 ${className}`}
    >
      <span aria-hidden="true" className="avatar-initial font-bold text-white leading-none select-none">
        {getInitials(name) || '?'}
      </span>
    </div>
  );
};
