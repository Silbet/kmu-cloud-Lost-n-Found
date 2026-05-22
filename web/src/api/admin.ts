import type { FoundItem, LostReport, SystemConfig, User } from '@/types';
import { apiClient, USE_MOCK } from './client';
import {
  mockAdminListItems, mockAdminListReports, mockAdminStats, mockAdminUnclaimed,
  mockApproveManager, mockCreateAdminAccount, mockGetConfig, mockListPendingManagers,
  mockRejectManager, mockUpdateConfig,
} from './mock/handlers';

export async function adminListReports(): Promise<LostReport[]> {
  if (USE_MOCK) return mockAdminListReports();
  return apiClient.get('/admin/reports').then((r) => r.data);
}
export async function adminListItems(): Promise<FoundItem[]> {
  if (USE_MOCK) return mockAdminListItems();
  return apiClient.get('/admin/items').then((r) => r.data);
}
export async function adminStats() {
  if (USE_MOCK) return mockAdminStats();
  return apiClient.get('/admin/stats').then((r) => r.data);
}
export async function adminUnclaimed(): Promise<FoundItem[]> {
  if (USE_MOCK) return mockAdminUnclaimed();
  return apiClient.get('/admin/unclaimed').then((r) => r.data);
}
export async function getConfig(): Promise<SystemConfig> {
  if (USE_MOCK) return mockGetConfig();
  return apiClient.get('/admin/config').then((r) => r.data);
}
export async function updateConfig(patch: Partial<SystemConfig>): Promise<SystemConfig> {
  if (USE_MOCK) return mockUpdateConfig(patch);
  return apiClient.patch('/admin/config', patch).then((r) => r.data);
}
export async function listPendingManagers(): Promise<User[]> {
  if (USE_MOCK) return mockListPendingManagers();
  return apiClient.get('/admin/pending-managers').then((r) => r.data);
}
export async function approveManager(userId: string): Promise<User> {
  if (USE_MOCK) return mockApproveManager(userId);
  return apiClient.post(`/admin/approve-manager/${userId}`).then((r) => r.data);
}
export async function rejectManager(userId: string): Promise<void> {
  if (USE_MOCK) return mockRejectManager(userId);
  return apiClient.delete(`/admin/reject-manager/${userId}`).then(() => undefined);
}
export async function createAdminAccount(payload: {
  email: string; password: string; name: string; contact: string;
}): Promise<User> {
  if (USE_MOCK) return mockCreateAdminAccount(payload);
  return apiClient.post('/admin/create-admin', payload).then((r) => r.data);
}
