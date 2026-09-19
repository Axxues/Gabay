import { getLikhaUrl } from './likhaClient';

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

    if (res.status === 401 || res.status === 403 || res.status === 400) {
      const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
      const err = data?.error;
      throw new ApiError(res.status, err?.code || 'request_failed', err?.message || `Request failed (${res.status}).`);
    }

    // If client error that is not 404, throw
    if (res.status > 400 && res.status < 500 && res.status !== 404) {
      const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
      const err = data?.error;
      throw new ApiError(res.status, err?.code || 'request_failed', err?.message || `Request failed (${res.status}).`);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
  }

  return resolveLikhaRoute<T>(path, options, token);
}

async function resolveLikhaRoute<T>(path: string, options: ApiOptions, token: string | null): Promise<T> {
  const likhaBase = getLikhaUrl();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    // 1. Authentication
    if (path.startsWith('/api/auth/login')) {
      const payload = (options.body as any) || {};

      // Check quick demo accounts
      if (payload.email && (payload.email.includes('@dmmmsu.edu.ph') || payload.email.includes('demo'))) {
        const role = payload.email.includes('faculty') ? 'faculty' : payload.email.includes('dean') ? 'admin' : payload.email.includes('staff') ? 'staff' : 'student';
        const name = payload.email.split('@')[0];
        const mockUser = {
          id: `demo-${name}`,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          email: payload.email,
          role,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
          department: 'College of Information Technology',
          title: role === 'faculty' ? 'Instructor' : role === 'admin' ? 'Dean' : 'Student',
          studentId: '23103733',
        };
        return { token: 'demo-token', user: mockUser } as unknown as T;
      }

      // Live authentication against Likha ERP (via proxy in dev)
      const loginRes = await fetch(`${likhaBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: payload.email, password: payload.password }),
      });

      if (loginRes.ok) {
        const json = await loginRes.json();
        const access_token = json?.data?.access_token || 'likha-token';
        const meRes = await fetch(`${likhaBase}/users/me`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const meJson = meRes.ok ? await meRes.json() : null;
        const dUser = meJson?.data || {};
        const name = [dUser.first_name, dUser.last_name].filter(Boolean).join(' ') || payload.email?.split('@')[0] || 'User';
        const user = {
          id: dUser.id || 'user-1',
          name,
          email: dUser.email || payload.email,
          role: dUser.user_role || 'student',
          avatar: dUser.avatar ? `${likhaBase}/assets/${dUser.avatar}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
          studentId: dUser.student_id,
          department: dUser.department || 'College of Information Technology',
          title: dUser.title || 'Student',
        };
        return { token: access_token, user } as unknown as T;
      }

      const errJson = await loginRes.json().catch(() => null);
      const errMsg = errJson?.errors?.[0]?.message || 'Invalid email or password.';
      throw new ApiError(401, 'invalid_credentials', errMsg);
    }

    if (path.startsWith('/api/auth/me')) {
      if (token && token !== 'demo-token' && token !== 'mock-token') {
        const meRes = await fetch(`${likhaBase}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const meJson = await meRes.json();
          const dUser = meJson?.data || {};
          const name = [dUser.first_name, dUser.last_name].filter(Boolean).join(' ') || dUser.email || 'User';
          return {
            user: {
              id: dUser.id,
              name,
              email: dUser.email,
              role: dUser.user_role || 'student',
              avatar: dUser.avatar ? `${likhaBase}/assets/${dUser.avatar}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
              studentId: dUser.student_id,
              department: dUser.department || 'College of Information Technology',
              title: dUser.title || 'Student',
            },
          } as unknown as T;
        }
      }
    }

    // 2. Courses
    if (path.startsWith('/api/courses')) {
      const res = await fetch(`${likhaBase}/items/courses?limit=100`, { headers });
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

    // 3. Calendar
    if (path.startsWith('/api/calendar')) {
      const res = await fetch(`${likhaBase}/items/calendar_events?limit=100`, { headers });
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

    // 4. Messages
    if (path.startsWith('/api/messages')) {
      const res = await fetch(`${likhaBase}/items/messages?limit=100`, { headers });
      if (res.ok) {
        const json = await res.json();
        return { messages: json.data || [] } as unknown as T;
      }
    }

    // 5. Assessments
    if (path.startsWith('/api/quizzes')) {
      const res = await fetch(`${likhaBase}/items/assessments?filter[type][_eq]=quiz`, { headers });
      if (res.ok) {
        const json = await res.json();
        return { quizzes: json.data || [] } as unknown as T;
      }
    }

    if (path.startsWith('/api/activities')) {
      const res = await fetch(`${likhaBase}/items/assessments?filter[type][_eq]=activity`, { headers });
      if (res.ok) {
        const json = await res.json();
        return { activities: json.data || [] } as unknown as T;
      }
    }

    if (path.startsWith('/api/exams')) {
      const res = await fetch(`${likhaBase}/items/assessments?filter[type][_eq]=exam`, { headers });
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
