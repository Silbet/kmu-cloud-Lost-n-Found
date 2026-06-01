import type { CreateLostReportRequest, LostReport, UpdateLostReportRequest } from '@/types';
import { apiClient, USE_MOCK } from './client';
import {
  mockCreateLostReport, mockDeleteLostReport, mockFinalizeReport, mockGetReport,
  mockListMyReports, mockUpdateLostReport,
} from './mock/handlers';

export async function createLostReport(payload: CreateLostReportRequest): Promise<LostReport> {
  if (USE_MOCK) return mockCreateLostReport(payload);
  return apiClient.post('/reports', payload).then((r) => r.data);
}
export async function listMyReports(): Promise<LostReport[]> {
  if (USE_MOCK) return mockListMyReports();
  return apiClient.get('/reports/my').then((r) => r.data);
}
export async function getReport(reportId: string): Promise<LostReport> {
  if (USE_MOCK) return mockGetReport(reportId);
  return apiClient.get(`/reports/${reportId}`).then((r) => r.data);
}
export async function updateLostReport(reportId: string, patch: UpdateLostReportRequest): Promise<LostReport> {
  if (USE_MOCK) return mockUpdateLostReport(reportId, patch);
  return apiClient.patch(`/reports/${reportId}`, patch).then((r) => r.data);
}
export async function deleteLostReport(reportId: string): Promise<void> {
  if (USE_MOCK) return mockDeleteLostReport(reportId);
  return apiClient.delete(`/reports/${reportId}`).then(() => undefined);
}
export async function finalizeReport(reportId: string): Promise<LostReport> {
  if (USE_MOCK) return mockFinalizeReport(reportId);
  return apiClient.post(`/reports/${reportId}/finalize`).then((r) => r.data);
}
