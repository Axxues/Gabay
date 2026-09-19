// Small async helpers shared by data-loading code.
import { lazy, type ComponentType } from 'react';

/** Unwrap a settled result, falling back when the promise rejected. */
export function settledValue<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === 'fulfilled' ? r.value : fallback;
}

const lazyImportCache = new Map<string, Promise<{ default: ComponentType<never> }>>();

/**
 * Wrapper around `React.lazy` that retries a failed dynamic import once
 * (e.g. after a redeploy invalidates cached chunks) and caches the
 * resulting promise so remounts reuse the same module load.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  cacheKey?: string,
) {
  const key = cacheKey ?? importer.toString();
  let cached = lazyImportCache.get(key);
  if (!cached) {
    cached = importer().catch(() => importer()) as Promise<{ default: ComponentType<never> }>;
    lazyImportCache.set(key, cached);
  }
  const promise = cached as Promise<{ default: T }>;
  return lazy(() => promise);
}
