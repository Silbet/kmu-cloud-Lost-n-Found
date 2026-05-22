import type { CreateFoundItemRequest, FoundItem, FoundItemStatus } from '@/types';
import { apiClient, USE_MOCK } from './client';
import {
  mockCreateFoundItem, mockDeleteItem, mockListAllItems, mockListMyItems,
  mockSetItemStatus, mockSetStorage,
} from './mock/handlers';

export async function createFoundItem(payload: CreateFoundItemRequest): Promise<FoundItem> {
  if (USE_MOCK) return mockCreateFoundItem(payload);
  return apiClient.post('/items', payload).then((r) => r.data);
}
export async function listMyItems(): Promise<FoundItem[]> {
  if (USE_MOCK) return mockListMyItems();
  return apiClient.get('/items/my').then((r) => r.data);
}
export async function listAllItems(): Promise<FoundItem[]> {
  if (USE_MOCK) return mockListAllItems();
  return apiClient.get('/items').then((r) => r.data);
}
export async function deleteItem(itemId: string): Promise<void> {
  if (USE_MOCK) return mockDeleteItem(itemId);
  return apiClient.delete(`/items/${itemId}`).then(() => undefined);
}
export async function setItemStorage(itemId: string, storageLocation: string): Promise<FoundItem> {
  if (USE_MOCK) return mockSetStorage(itemId, storageLocation);
  return apiClient.patch(`/items/${itemId}/storage`, { storageLocation }).then((r) => r.data);
}
export async function setItemStatus(itemId: string, status: FoundItemStatus): Promise<FoundItem> {
  if (USE_MOCK) return mockSetItemStatus(itemId, status);
  return apiClient.patch(`/items/${itemId}/status`, { status }).then((r) => r.data);
}
