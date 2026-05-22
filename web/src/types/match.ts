import type { FoundItem } from './item';

export type MatchStatus = '활성' | '확인요청중' | '승인' | '반려' | '비활성';

export interface Match {
  matchId: string;
  reportId: string;
  itemId: string;
  status: MatchStatus;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchWithItem extends Match {
  item: FoundItem;
}
