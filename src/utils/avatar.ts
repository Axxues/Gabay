/**
 * Avatar helpers.
 * Users without an uploaded photo get an initial-letter avatar; legacy
 * Unsplash stock photo urls count as "no photo" so existing accounts flip
 * to initials automatically.
 */

export function getInitials(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '';
  return trimmed[0].toUpperCase();
}

export function avatarHue(name: string): number {
  let hash = 0;
  const key = name || '';
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

export function avatarBackground(name: string): string {
  return `hsl(${avatarHue(name)} 55% 42%)`;
}

export function isDefaultAvatarUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true;
  return url.includes('images.unsplash.com');
}

export function hasCustomAvatar(url: string | null | undefined): boolean {
  return !isDefaultAvatarUrl(url);
}
