import { readMe } from '@likha-erp/likha-sdk';
import { likha, LIKHA_URL } from '@/services/core/likhaClient';
import { setToken, clearToken, getToken } from '@/services/core/client';
import type { LoginPayload, LoginResponse, MeResponse } from '@/services/auth/types/auth.types';
import type { User, UserRole } from '@/services/lms/types/lms.types';

export function mapDirectusUserToUser(dUser: any): User {
  const name =
    [dUser.first_name, dUser.last_name].filter(Boolean).join(' ') ||
    dUser.email?.split('@')[0] ||
    'Student User';
  return {
    id: dUser.id,
    name,
    email: dUser.email || '',
    role: (dUser.user_role as UserRole) || 'student',
    avatar: dUser.avatar
      ? `${LIKHA_URL}/assets/${dUser.avatar}`
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    studentId: dUser.student_id || undefined,
    department: dUser.department || 'College of Information Technology',
    title: dUser.title || 'Student',
    banner: dUser.banner || undefined,
    enrolledCourseIds: [],
  };
}

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const authResult = await (likha.login as any)({ email: payload.email, password: payload.password });
    const token = (authResult as any)?.access_token || getToken() || '';
    if (!token) {
      throw new Error('No authentication token received.');
    }
    setToken(token);

    const meResult = await likha.request(readMe({ fields: ['*'] as any }));
    const user = mapDirectusUserToUser(meResult);
    return { token, user };
  },

  async me(): Promise<MeResponse> {
    const meResult = await likha.request(readMe({ fields: ['*'] as any }));
    return { user: mapDirectusUserToUser(meResult) };
  },

  logout(): void {
    try {
      likha.logout().catch(() => {});
    } finally {
      clearToken();
    }
  },
};
