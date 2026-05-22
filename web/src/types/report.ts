export type LostReportStatus = '접수' | '매칭후보있음' | '찾기완료' | '종료';

export interface LostReport {
  reportId: string;
  reporterId: string;
  reporterName: string;
  reporterContact: string;
  itemName: string;
  category: string;
  lostPlace: string;
  lostDate: string;
  description: string;
  status: LostReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLostReportRequest {
  itemName: string;
  category: string;
  lostPlace: string;
  lostDate: string;
  description: string;
  reporterContact: string;
}

export type UpdateLostReportRequest = Partial<CreateLostReportRequest>;
