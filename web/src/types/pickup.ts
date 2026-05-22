export type PickupStatus = '수령대기' | '수령완료' | '취소';
export type CancelReason = '분실자취소' | '관리자취소' | '시스템자동취소';

export interface Pickup {
  pickupId: string;
  matchId: string;
  reportId: string;
  itemId: string;
  pickupCode: string;
  status: PickupStatus;
  waitingStartedAt: string;
  autoCancelAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: CancelReason;
}
