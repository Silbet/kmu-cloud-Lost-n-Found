import type { CancelReason, Pickup } from '@/types';
import { apiClient, USE_MOCK } from './client';
import {
  mockCancelPickup, mockCompletePickup, mockGetPickup, mockGetPickupByReport,
  mockListWaitingPickups, mockVerifyPickup,
} from './mock/handlers';

export async function getPickup(pickupId: string): Promise<Pickup> {
  if (USE_MOCK) return mockGetPickup(pickupId);
  return apiClient.get(`/pickups/${pickupId}`).then((r) => r.data);
}
export async function getPickupByReport(reportId: string): Promise<Pickup | null> {
  if (USE_MOCK) return mockGetPickupByReport(reportId);
  return apiClient.get(`/pickups/by-report/${reportId}`).then((r) => r.data);
}
export async function listWaitingPickups(): Promise<Pickup[]> {
  if (USE_MOCK) return mockListWaitingPickups();
  return apiClient.get('/pickups/waiting').then((r) => r.data);
}
export async function verifyPickup(
  pickupId: string,
  body: { name: string; contact: string; code: string },
): Promise<{ allMatched: boolean; mismatches: ('name' | 'contact' | 'code')[] }> {
  if (USE_MOCK) return mockVerifyPickup(pickupId, body);
  return apiClient.post(`/pickups/${pickupId}/verify`, body).then((r) => r.data);
}
export async function completePickup(pickupId: string): Promise<Pickup> {
  if (USE_MOCK) return mockCompletePickup(pickupId);
  return apiClient.post(`/pickups/${pickupId}/complete`).then((r) => r.data);
}
export async function cancelPickup(pickupId: string, reason: CancelReason): Promise<Pickup> {
  if (USE_MOCK) return mockCancelPickup(pickupId, reason);
  return apiClient.post(`/pickups/${pickupId}/cancel`, { reason }).then((r) => r.data);
}
