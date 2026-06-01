export type NotificationType =
  | '매칭후보생성'
  | '확인요청승인'
  | '확인요청반려'
  | '수령자동취소임박'
  | '수령대기취소'
  | '폐기검토필요'
  | '보관소관리자승인요청'; // 운영자에게 발송

export interface Notification {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}
