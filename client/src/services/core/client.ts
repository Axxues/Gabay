import { LIKHA_URL } from './likhaClient';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const TOKEN_KEY = 'gabay_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface ApiOptions {
  method?: string;
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(path, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | T;
      if (data && typeof data === 'object' && 'error' in (data as object)) {
        const err = (data as { error?: { code?: string; message?: string } })?.error;
        throw new ApiError(res.status, err?.code || 'request_failed', err?.message || `Request failed (${res.status}).`);
      }
      return data as T;
    }

    if (res.status === 401 || res.status === 403 || res.status >= 500) {
      const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
      const err = data?.error;
      throw new ApiError(res.status, err?.code || 'request_failed', err?.message || `Request failed (${res.status}).`);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
  }

  return resolveLikhaRoute<T>(path, options, token);
}

async function resolveLikhaRoute<T>(path: string, _options: ApiOptions, token: string | null): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    if (path.startsWith('/api/courses')) {
      const res = await fetch(`${LIKHA_URL}/items/courses?limit=100`, { headers });
      if (res.ok) {
        const json = await res.json();
        const courses = (json.data || []).map((item: any) => ({
          id: item.id,
          code: item.code,
          title: item.title,
          section: item.section || 'BSIT 3-A',
          term: item.term || '1st Semester 2026-2027',
          instructorId: item.instructor_id || '',
          instructorName: 'Faculty Member',
          published: item.published !== false,
          credits: item.credits || 3,
          enrolledCount: item.enrolled_count || 0,
          syllabus: item.syllabus || null,
          sectionIds: item.sections ? item.sections.map((s: any) => s.name) : [],
        }));
        return { courses } as unknown as T;
      }
    }

    if (path.startsWith('/api/calendar')) {
      const res = await fetch(`${LIKHA_URL}/items/calendar_events?limit=100`, { headers });
      if (res.ok) {
        const json = await res.json();
        const events = (json.data || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          time: e.start_time ? `${e.start_time} - ${e.end_time || ''}` : 'All Day',
          type: e.type || 'event',
          description: e.description || '',
        }));
        return { events } as unknown as T;
      }
    }

    if (path.startsWith('/api/messages')) {
      const res = await fetch(`${LIKHA_URL}/items/messages?limit=100`, { headers });
      if (res.ok) {
        const json = await res.json();
        return { messages: json.data || [] } as unknown as T;
      }
    }

    if (path.startsWith('/api/quizzes')) {
      const res = await fetch(`${LIKHA_URL}/items/assessments?filter[type][_eq]=quiz`, { headers });
      if (res.ok) {
        const json = await res.json();
        return { quizzes: json.data || [] } as unknown as T;
      }
    }

    if (path.startsWith('/api/activities')) {
      const res = await fetch(`${LIKHA_URL}/items/assessments?filter[type][_eq]=activity`, { headers });
      if (res.ok) {
        const json = await res.json();
        return { activities: json.data || [] } as unknown as T;
      }
    }

    if (path.startsWith('/api/exams')) {
      const res = await fetch(`${LIKHA_URL}/items/assessments?filter[type][_eq]=exam`, { headers });
      if (res.ok) {
        const json = await res.json();
        return { exams: json.data || [] } as unknown as T;
      }
    }
  } catch {
    // Network catch
  }

  // Safe defaults
  if (path.includes('notifications')) return { notifications: [] } as unknown as T;
  if (path.includes('messages')) return { messages: [] } as unknown as T;
  if (path.includes('calendar')) return { events: [] } as unknown as T;
  if (path.includes('announcements')) return { announcements: [] } as unknown as T;
  if (path.includes('discussions')) return { discussions: [] } as unknown as T;
  if (path.includes('folders')) return { folders: [] } as unknown as T;
  if (path.includes('files')) return { files: [] } as unknown as T;
  if (path.includes('grades')) return { grades: [] } as unknown as T;
  if (path.includes('quizzes')) return { quizzes: [] } as unknown as T;
  if (path.includes('activities')) return { activities: [] } as unknown as T;
  if (path.includes('exams')) return { exams: [] } as unknown as T;
  if (path.includes('submissions')) return { submissions: [] } as unknown as T;
  if (path.includes('users')) return { users: [] } as unknown as T;

  throw new ApiError(500, 'request_failed', `Failed to load ${path}`);
}

export interface PaginatedParams {
  page: number;
  pageSize: number;
  search?: string;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
}

export function buildPaginatedParams(params: PaginatedParams): Record<string, string> {
  const out: Record<string, string> = {
    page: String(params.page),
    pageSize: String(params.pageSize),
  };
  if (params.search) out.search = params.search;
  if (params.sortKey) out.sortKey = params.sortKey;
  if (params.sortDir) out.sortDir = params.sortDir;
  return out;
}
