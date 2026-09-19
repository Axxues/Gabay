import { createLikha, rest, authentication } from '@likha-erp/likha-sdk';
import type { LikhaSchema } from './types';

export const LIKHA_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LIKHA_URL) || 'https://gabay.zyberlab.com';

export const likha = createLikha<LikhaSchema>(LIKHA_URL)
  .with(rest())
  .with(authentication('json'));
