import type { FoundItem, LostReport } from '@/types';
import { apiClient, USE_MOCK } from './client';
import { mockSearchFound, mockSearchLost } from './mock/handlers';

export interface SearchParams {
  category?: string;
  place?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  status?: string;
}

export async function searchLost(params: SearchParams): Promise<LostReport[]> {
  if (USE_MOCK) return mockSearchLost(params);
  return apiClient.get('/search/lost', { params }).then((r) => r.data);
}
export async function searchFound(params: SearchParams): Promise<FoundItem[]> {
  if (USE_MOCK) return mockSearchFound(params);
  return apiClient.get('/search/found', { params }).then((r) => r.data);
}
