import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveMatch, listPendingConfirmations, rejectMatch } from '@/api/matches';
import { getReport } from '@/api/reports';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Textarea } from '@/components/common/Textarea';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { fmtDateTime } from '@/utils/date';
import { toast } from '@/store/toastStore';
import type { MatchWithItem } from '@/types';

export function ConfirmationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['pending-confirmations'], queryFn: listPendingConfirmations });
  const [rejectTarget, setRejectTarget] = useState<MatchWithItem | null>(null);
  const [reason, setReason] = useState('');

  const approveMut = useMutation({
    mutationFn: (id: string) => approveMatch(id),
    onSuccess: () => { toast('승인되었습니다. 수령 코드가 발급되었습니다.', 'success'); qc.invalidateQueries(); },
    onError: (e: any) => toast(e?.message || '실패', 'error'),
  });
  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectMatch(id, reason),
    onSuccess: () => { toast('반려되었습니다.', 'success'); qc.invalidateQueries(); setRejectTarget(null); setReason(''); },
    onError: (e: any) => toast(e?.message || '실패', 'error'),
  });

  if (isLoading) return <Spinner />;
  if (!data || data.length === 0) return <EmptyState title="대기 중인 확인 요청이 없습니다" />;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">확인 요청 처리</h1>
      <div className="space-y-3">
        {data.map((m) => <ConfirmCard key={m.matchId} match={m} onApprove={() => approveMut.mutate(m.matchId)} onReject={() => setRejectTarget(m)} />)}
      </div>

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="반려 처리"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>취소</Button>
            <Button variant="danger" onClick={() => rejectTarget && rejectMut.mutate({ id: rejectTarget.matchId, reason })}>반려 확정</Button>
          </>
        }
      >
        <Textarea label="반려 사유 (선택, 권장)" placeholder="예: 사진과 실물이 다름, 분실 일자가 너무 차이남 등" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </div>
  );
}

function ConfirmCard({ match, onApprove, onReject }: { match: MatchWithItem; onApprove: () => void; onReject: () => void }) {
  const { data: report } = useQuery({ queryKey: ['report', match.reportId], queryFn: () => getReport(match.reportId) });
  return (
    <Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-2">분실 신고</h3>
          {report ? (
            <>
              <p className="font-medium">{report.itemName}</p>
              <p className="text-sm text-gray-600">{report.category} · {report.lostPlace}</p>
              <p className="text-xs text-gray-500">분실: {fmtDateTime(report.lostDate)}</p>
              <p className="text-xs text-gray-500 mt-1">신고자: {report.reporterName} ({report.reporterContact})</p>
              {report.description && <p className="text-xs text-gray-600 mt-1">{report.description}</p>}
            </>
          ) : <p className="text-xs text-gray-400">로딩 중...</p>}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-2">습득물</h3>
          {match.item.imageUrl && <img src={match.item.imageUrl} alt="" className="w-full h-32 object-cover rounded mb-2 bg-gray-100" />}
          <p className="font-medium">{match.item.itemName}</p>
          <p className="text-sm text-gray-600">{match.item.category} · {match.item.foundPlace}</p>
          <p className="text-xs text-gray-500">습득: {fmtDateTime(match.item.foundDate)}</p>
          <p className="text-xs text-gray-500 mt-1">보관 위치: {match.item.storageLocation ?? '-'}</p>
          {match.item.description && <p className="text-xs text-gray-600 mt-1">{match.item.description}</p>}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <Button variant="secondary" onClick={onReject}>반려</Button>
        <Button onClick={onApprove}>승인</Button>
      </div>
    </Card>
  );
}
