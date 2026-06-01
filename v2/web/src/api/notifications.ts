import type { Notification } from '@/types';
import { apiClient, USE_MOCK } from './client';
import { mockListNotifications, mockMarkAllRead, mockMarkRead, mockUnreadCount } from './mock/handlers';

export async function listNotifications(): Promise<Notification[]> {
  if (USE_MOCK) return mockListNotifications();
  return apiClient.get('/notifications').then((r) => r.data);
}
export async function unreadCount(): Promise<{ count: number }> {
  if (USE_MOCK) return mockUnreadCount();
  return apiClient.get('/notifications/unread-count').then((r) => r.data);
}
export async function markRead(id: string): Promise<Notification> {
  if (USE_MOCK) return mockMarkRead(id);
  return apiClient.patch(`/notifications/${id}/read`).then((r) => r.data);
}
export async function markAllRead(): Promise<{ updated: number }> {
  if (USE_MOCK) return mockMarkAllRead();
  return apiClient.patch('/notifications/read-all').then((r) => r.data);
}
