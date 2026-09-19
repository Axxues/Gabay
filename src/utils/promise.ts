// Small async helpers shared by data-loading code.

/** Unwrap a settled result, falling back when the promise rejected. */
export function settledValue<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === 'fulfilled' ? r.value : fallback;
}
