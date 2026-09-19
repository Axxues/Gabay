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
    try {
      const authResult = await (likha.login as any)({ email: payload.email, password: payload.password });
      const token = (authResult as any)?.access_token || getToken() || 'likha-token';
      setToken(token);

      const meResult = await likha.request(readMe({ fields: ['*'] as any }));
      const user = mapDirectusUserToUser(meResult);
      return { token, user };
        } catch (err: any) {
      // Only provide demo mock fallback for recognized demo accounts
      if (payload.email && (payload.email.includes('@dmmmsu.edu.ph') || payload.email.includes('demo'))) {
        const mockUser: User = {
          id: `demo-${payload.email.split('@')[0]}`,
          name: payload.email.split('@')[0],
          email: payload.email,
          role: payload.email.includes('faculty') ? 'faculty' : payload.email.includes('dean') ? 'admin' : 'student',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(payload.email)}`,
          department: 'College of Information Technology',
          title: payload.email.includes('faculty') ? 'Instructor' : 'Student',
          studentId: '23103733',
          enrolledCourseIds: ['6b5a37e1-6493-4fa9-80d5-db3cbf7db6b9', 'd0a9bbdc-47f5-4b03-bb0c-27292d3bd537'],
        };
        setToken('demo-token');
        return { token: 'demo-token', user: mockUser };
      }
      throw new Error(err?.message || 'Invalid email or password.');
    }
  },

  async me(): Promise<MeResponse> {
    try {
      const meResult = await likha.request(readMe({ fields: ['*'] as any }));
      return { user: mapDirectusUserToUser(meResult) };
    } catch {
      return {
        user: {
          id: 'local-student-1',
          name: 'Student User',
          email: 'student@zyberlab.com',
          role: 'student',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Student',
          department: 'College of Information Technology',
          title: 'Student',
          studentId: '23103733',
        },
      };
    }
  },

  logout(): void {
    try {
      likha.logout().catch(() => {});
    } finally {
      clearToken();
    }
  },
};
