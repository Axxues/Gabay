// client/src/utils/gradingTerms.ts
export type TermId = 'prelim' | 'midterm' | 'finals';
export const ALL_TERMS: TermId[] = ['prelim', 'midterm', 'finals'];
const ORDER: Record<TermId, number> = { prelim: 0, midterm: 1, finals: 2 };

export function normalizeTermId(raw: unknown): TermId | null {
  if (raw === 'final') return 'finals';
  return raw === 'prelim' || raw === 'midterm' || raw === 'finals' ? raw : null;
}

const EXAM_PATTERNS: { id: TermId; re: RegExp }[] = [
  { id: 'prelim', re: /\bprelim(?:inary)?\b/i },
  { id: 'midterm', re: /\bmid[-\s]?term\b/i },
  { id: 'finals', re: /\bfinal(?:s)?\b/i },
];

interface OutlineLike { title?: string; topics?: string[] }

export function resolveCourseTerms(syllabus: { courseOutline?: OutlineLike[] } | null | undefined): TermId[] {
  const found = new Set<TermId>();
  for (const entry of syllabus?.courseOutline ?? []) {
    const hay = `${entry.title ?? ''}\n${(entry.topics ?? []).join('\n')}`;
    if (!/examina/i.test(hay)) continue;
    for (const { id, re } of EXAM_PATTERNS) {
      if (re.test(hay)) found.add(id);
    }
  }
  if (found.size === 0) return ['midterm', 'finals'];
  return [...found].sort((a, b) => ORDER[a] - ORDER[b]);
}

export function effectiveTerms(
  courseLike: { gradingTerms?: string[] | null } | null | undefined,
  syllabus: { courseOutline?: OutlineLike[] } | null | undefined,
): TermId[] {
  const override = (courseLike?.gradingTerms ?? []).map(normalizeTermId).filter((t): t is TermId => t !== null);
  if (override.length > 0) {
    return [...new Set(override)].sort((a, b) => ORDER[a] - ORDER[b]);
  }
  return resolveCourseTerms(syllabus);
}

export function normalizeGradesReleased(raw: unknown): Partial<Record<TermId, boolean>> {
  const out: Partial<Record<TermId, boolean>> = {};
  let obj: unknown = raw;
  if (typeof raw === 'string' && raw) {
    try {
      obj = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const term = normalizeTermId(k);
    if (term !== null && typeof v === 'boolean') out[term] = v;
  }
  return out;
}
