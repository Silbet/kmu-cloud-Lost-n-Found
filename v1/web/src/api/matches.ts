import type { Match, MatchWithItem } from '@/types';
import { apiClient, USE_MOCK } from './client';
import {
  mockApproveMatch, mockClaimFoundItem, mockConfirmMatch, mockListMatchesForReport,
  mockListPendingConfirmations, mockRejectMatch,
} from './mock/handlers';

export async function listMatchesForReport(reportId: string): Promise<MatchWithItem[]> {
  if (USE_MOCK) return mockListMatchesForReport(reportId);
  return apiClient.get(`/reports/${reportId}/matches`).then((r) => r.data);
}
export async function listPendingConfirmations(): Promise<MatchWithItem[]> {
  if (USE_MOCK) return mockListPendingConfirmations();
  return apiClient.get('/matches/pending').then((r) => r.data);
}
export async function confirmMatch(matchId: string): Promise<Match> {
  if (USE_MOCK) return mockConfirmMatch(matchId);
  return apiClient.post(`/matches/${matchId}/confirm`).then((r) => r.data);
}
export async function approveMatch(matchId: string): Promise<Match> {
  if (USE_MOCK) return mockApproveMatch(matchId);
  return apiClient.post(`/matches/${matchId}/approve`).then((r) => r.data);
}
export async function rejectMatch(matchId: string, reason?: string): Promise<Match> {
  if (USE_MOCK) return mockRejectMatch(matchId, reason);
  return apiClient.post(`/matches/${matchId}/reject`, { reason }).then((r) => r.data);
}

/** 일반사용자가 검색에서 직접 습득물에 확인 요청 (매칭 없으면 자동 생성 후 요청) */
export async function claimFoundItem(itemId: string, reportId: string): Promise<Match> {
  if (USE_MOCK) return mockClaimFoundItem(itemId, reportId);
  return apiClient.post(`/items/${itemId}/claim`, { reportId }).then((r) => r.data);
}
