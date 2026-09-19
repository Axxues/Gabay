import { createLikha, rest, authentication } from '@likha-erp/likha-sdk';
import type { LikhaSchema } from './types';

export const getLikhaUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LIKHA_URL) {
    return import.meta.env.VITE_LIKHA_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return `${window.location.origin}/likha`;
  }
  return 'https://gabay.zyberlab.com';
};

export const LIKHA_URL = getLikhaUrl();

export const likha = createLikha<LikhaSchema>(LIKHA_URL)
  .with(rest())
  .with(authentication('json'));
