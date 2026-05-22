import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listMyReports } from '@/api/reports';
import { listMatchesForReport } from '@/api/matches';
import { cancelPickup, getPickupByReport } from '@/api/pickups';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { fmtDateTime } from '@/utils/date';
import { toast } from '@/store/toastStore';
import type { LostReport, Pickup } from '@/types';

export function MyReportsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['my-reports'], queryFn: listMyReports });
  const [pickupModal, setPickupModal] = useState<Pickup | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const cancelMut = useMutation({
    mutationFn: () => cancelPickup(pickupModal!.pickupId, '분실자취소'),
    onSuccess: () => {
      toast('수령 대기가 취소되었습니다.', 'success');
      qc.invalidateQueries();
      setPickupModal(null);
      setCancelConfirm(false);
      navigate('/reports/my');
    },
    onError: (e: any) => {
      toast(e?.message || '취소 실패', 'error');
      setCancelConfirm(false);
    },
  });

  if (isLoading) return <Spinner />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="등록한 분실 신고가 없습니다"
        action={<Link to="/reports/new"><Button>신고하기</Button></Link>}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-semibold">내 분실 신고</h1>
        <Link to="/reports/new"><Button size="sm">새 신고</Button></Link>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">물품명</th>
              <th className="text-left px-4 py-2 font-medium">카테고리</th>
              <th className="text-left px-4 py-2 font-medium">장소</th>
              <th className="text-left px-4 py-2 font-medium">분실 일시</th>
              <th className="text-left px-4 py-2 font-medium">상태</th>
              <th className="text-left px-4 py-2 font-medium">매칭</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <Row key={r.reportId} report={r} onShowPickup={setPickupModal} />
            ))}
          </tbody>
        </table>
      </div>

      {/* 수령 코드 모달 */}
      <Modal
        open={!!pickupModal && !cancelConfirm}
        onClose={() => setPickupModal(null)}
        title="수령 인증 코드"
        footer={
          <>
            <Button variant="danger" onClick={() => setCancelConfirm(true)}>수령 취소</Button>
            <Button onClick={() => setPickupModal(null)}>닫기</Button>
          </>
        }
      >
        {pickupModal && (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">보관소에 방문할 때 이 코드를 제시하세요.</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg py-4">
              <p className="text-4xl font-mono font-bold tracking-widest text-blue-700">
                {pickupModal.pickupCode}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              자동 취소 예정: {fmtDateTime(pickupModal.autoCancelAt)}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              보관소 방문 시 신분증과 이 화면을 함께 제시하세요.
            </p>
          </div>
        )}
      </Modal>

      {/* 수령 취소 확인 모달 */}
      <Modal
        open={cancelConfirm}
        onClose={() => setCancelConfirm(false)}
        title="수령 대기 취소"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelConfirm(false)}>
              돌아가기
            </Button>
            <Button
              variant="danger"
              disabled={cancelMut.isPending}
              onClick={() => cancelMut.mutate()}
            >
              {cancelMut.isPending ? '취소 중...' : '취소 확정'}
            </Button>
          </>
        }
      >
        수령 대기를 취소하면 해당 매칭이 다시 활성화되어 다른 후보를 확인 요청할 수 있습니다.
        <br />
        계속하시겠습니까?
      </Modal>
    </div>
  );
}

function Row({
  report,
  onShowPickup,
}: {
  report: LostReport;
  onShowPickup: (p: Pickup) => void;
}) {
  const { data: matches } = useQuery({
    queryKey: ['matches', report.reportId],
    queryFn: () => listMatchesForReport(report.reportId),
  });
  const { data: pickup } = useQuery({
    queryKey: ['pickup-by-report', report.reportId],
    queryFn: () => getPickupByReport(report.reportId),
    enabled: report.status === '찾기완료',
  });

  const candidateCount = matches?.filter((m) => m.status !== '비활성').length ?? 0;
  const hasActivePickup = pickup && pickup.status === '수령대기';

  return (
    <tr className="border-t border-gray-100">
      <td className="px-4 py-2 font-medium">{report.itemName}</td>
      <td className="px-4 py-2">{report.category}</td>
      <td className="px-4 py-2">{report.lostPlace || '-'}</td>
      <td className="px-4 py-2">{fmtDateTime(report.lostDate)}</td>
      <td className="px-4 py-2"><StatusBadge status={report.status} /></td>
      <td className="px-4 py-2">{candidateCount}건</td>
      <td className="px-4 py-2 text-right flex gap-2 justify-end">
        {hasActivePickup && (
          <button
            onClick={() => onShowPickup(pickup)}
            className="text-xs text-blue-600 border border-blue-300 rounded px-2 py-0.5 hover:bg-blue-50 whitespace-nowrap"
          >
            🔑 수령 코드
          </button>
        )}
        <Link to={`/reports/${report.reportId}`} className="text-blue-600 hover:underline text-sm">
          상세
        </Link>
      </td>
    </tr>
  );
}
