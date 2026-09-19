import { describe, expect, it } from 'vitest';
import {
  avatarBackground,
  avatarHue,
  getInitials,
  hasCustomAvatar,
  isDefaultAvatarUrl,
} from './avatar';

describe('avatar initials', () => {
  it('uses the first letter of the name', () => {
    expect(getInitials('Faculty 1')).toBe('F');
    expect(getInitials('Student 1')).toBe('S');
  });

  it('uppercases and trims leading whitespace', () => {
    expect(getInitials('  maria')).toBe('M');
    expect(getInitials('student2@gmail.com')).toBe('S');
  });

  it('falls back to empty for blank names', () => {
    expect(getInitials('')).toBe('');
    expect(getInitials('   ')).toBe('');
  });
});

describe('avatar color', () => {
  it('is deterministic per name and a valid hue', () => {
    const hue = avatarHue('Faculty 1');
    expect(Number.isInteger(hue)).toBe(true);
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
    expect(avatarHue('Faculty 1')).toBe(hue);
  });

  it('builds a css background from the hue', () => {
    expect(avatarBackground('Faculty 1')).toBe(`hsl(${avatarHue('Faculty 1')} 55% 42%)`);
  });
});

describe('default avatar detection', () => {
  it('treats empty avatars as default', () => {
    expect(isDefaultAvatarUrl('')).toBe(true);
    expect(isDefaultAvatarUrl(null)).toBe(true);
    expect(isDefaultAvatarUrl(undefined)).toBe(true);
  });

  it('treats the legacy stock photo urls as default', () => {
    expect(
      isDefaultAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')
    ).toBe(true);
    expect(
      isDefaultAvatarUrl('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80')
    ).toBe(true);
    expect(
      isDefaultAvatarUrl('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80')
    ).toBe(true);
  });

  it('keeps uploaded and data-url avatars as custom', () => {
    expect(isDefaultAvatarUrl('/uploads/1725900000_photo.png')).toBe(false);
    expect(isDefaultAvatarUrl('https://example.com/me.jpg')).toBe(false);
    expect(isDefaultAvatarUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(false);
  });

  it('hasCustomAvatar is the negation', () => {
    expect(hasCustomAvatar('')).toBe(false);
    expect(hasCustomAvatar('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150')).toBe(false);
    expect(hasCustomAvatar('/uploads/1725900000_photo.png')).toBe(true);
  });
});
