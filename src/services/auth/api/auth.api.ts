import { apiFetch, clearToken, setToken } from '@/services/core/client';
import type { LoginPayload, LoginResponse, MeResponse } from '@/services/auth/types/auth.types';

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const res = await apiFetch<LoginResponse>('/api/auth/login', { method: 'POST', body: payload });
    setToken(res.token);
    return res;
  },
  me: (): Promise<MeResponse> => apiFetch<MeResponse>('/api/auth/me', { method: 'GET' }),
  logout: (): void => {
    clearToken();
  },
};
