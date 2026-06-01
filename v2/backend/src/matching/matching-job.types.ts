export type MatchingJobTarget = 'report' | 'item';

export interface MatchingJobMessage {
  target: MatchingJobTarget;
  id: string;
  requestedAt: string;
}
