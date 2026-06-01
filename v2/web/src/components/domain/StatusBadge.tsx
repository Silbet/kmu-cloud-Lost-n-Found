import { Badge } from '@/components/common/Badge';
import type { FoundItemStatus, LostReportStatus, MatchStatus, PickupStatus } from '@/types';

type AnyStatus = LostReportStatus | FoundItemStatus | MatchStatus | PickupStatus;

const toneFor = (s: AnyStatus) => {
  switch (s) {
    case '접수':
    case '등록':
      return 'gray' as const;
    case '매칭후보있음':
    case '보관중':
      return 'blue' as const;
    case '수령대기':
    case '확인요청중':
      return 'amber' as const;
    case '찾기완료':
    case '수령완료':
    case '승인':
      return 'green' as const;
    case '종료':
    case '폐기예정':
      return 'red' as const;
    case '반려':
    case '비활성':
    case '취소':
      return 'muted' as const;
    case '활성':
      return 'blue' as const;
    default:
      return 'gray' as const;
  }
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  return <Badge tone={toneFor(status)}>{status}</Badge>;
}
