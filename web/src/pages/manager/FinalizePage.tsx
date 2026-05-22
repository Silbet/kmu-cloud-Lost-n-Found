import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminListReports } from '@/api/admin';
import { finalizeReport as finalize } from '@/api/reports';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { fmtDateTime } from '@/utils/date';
import { toast } from '@/store/toastStore';
import type { LostReport } from '@/types';

export function FinalizePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-reports'], queryFn: adminListReports });
  const [target, setTarget] = useState<LostReport | null>(null);
  const mut = useMutation({
    mutationFn: (id: string) => finalize(id),
    onSuccess: () => { toast('종료 처리되었습니다.', 'success'); qc.invalidateQueries(); setTarget(null); },
    onError: (e: any) => toast(e?.message || '실패', 'error'),
  });

  if (isLoading) return <Spinner />;
  const list = data?.filter((r) => r.status === '찾기완료') ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">찾기완료 종료 처리</h1>
      <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded p-2 mb-4">
        분실자에게 물품을 실물 전달 완료한 후 이 페이지에서 '종료 처리'를 눌러주세요. 종료된 신고는 통계 외에는 더 이상 노출되지 않습니다.
      </p>
      {list.length === 0 ? (
        <EmptyState title="종료 처리 대기 중인 신고가 없습니다" />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">신고자</th>
                <th className="text-left px-4 py-2 font-medium">물품명</th>
                <th className="text-left px-4 py-2 font-medium">수령 완료 일시</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.reportId} className="border-t border-gray-100">
                  <td className="px-4 py-2">{r.reporterName}</td>
                  <td className="px-4 py-2 font-medium">{r.itemName}</td>
                  <td className="px-4 py-2">{fmtDateTime(r.updatedAt)}</td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" onClick={() => setTarget(r)}>종료 처리</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="종료 처리 확인"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>취소</Button>
            <Button onClick={() => target && mut.mutate(target.reportId)}>확정</Button>
          </>
        }
      >
        '{target?.itemName}' 신고를 종료 상태로 전환합니다. 이 동작은 되돌릴 수 없습니다.
      </Modal>
    </div>
  );
}
