import type { LoginRequest, LoginResponse, SignupRequest, User } from '@/types';
import { apiClient, USE_MOCK } from './client';
import {
  mockChangePassword, mockLogin, mockLogout, mockMe, mockSignup,
} from './mock/handlers';

export async function signup(payload: SignupRequest): Promise<{ user: User }> {
  if (USE_MOCK) return mockSignup(payload);
  return apiClient.post('/auth/signup', payload).then((r) => r.data);
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  if (USE_MOCK) return mockLogin(payload);
  return apiClient.post('/auth/login', payload).then((r) => r.data);
}

export async function logout(): Promise<void> {
  if (USE_MOCK) return mockLogout();
  return apiClient.post('/auth/logout').then(() => undefined);
}

export async function me(): Promise<User> {
  if (USE_MOCK) return mockMe();
  return apiClient.get('/auth/me').then((r) => r.data);
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  if (USE_MOCK) return mockChangePassword(oldPassword, newPassword);
  return apiClient.post('/auth/change-password', { oldPassword, newPassword }).then(() => undefined);
}
