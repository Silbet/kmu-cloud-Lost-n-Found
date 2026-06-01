import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { completePickup, listWaitingPickups, verifyPickup } from '@/api/pickups';
import { listAllItems } from '@/api/items';
import { getReport } from '@/api/reports';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { CountdownTimer } from '@/components/domain/CountdownTimer';
import { toast } from '@/store/toastStore';
import type { Pickup } from '@/types';

export function ManagerPickupsPage() {
  const { data: pickups, isLoading } = useQuery({ queryKey: ['waiting-pickups'], queryFn: listWaitingPickups });
  const { data: items } = useQuery({ queryKey: ['all-items'], queryFn: listAllItems });
  const [selected, setSelected] = useState<Pickup | null>(null);

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">수령 처리</h1>
      <p className="text-sm text-red-600 mb-4 bg-red-50 border border-red-200 rounded p-2">
        ⚠️ <strong>대리 수령은 불가합니다.</strong> 분실자 본인의 신분증을 반드시 확인하세요.
      </p>
      {!pickups || pickups.length === 0 ? (
        <EmptyState title="수령 대기 중인 항목이 없습니다" />
      ) : selected ? (
        <ProcessForm pickup={selected} onDone={() => setSelected(null)} />
      ) : (
        <div className="space-y-2">
          {pickups.map((p) => {
            const item = items?.find((i) => i.itemId === p.itemId);
            return (
              <Card key={p.pickupId}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item?.itemName ?? '-'}</p>
                    <p className="text-xs text-gray-500">보관 위치: {item?.storageLocation ?? '-'}</p>
                    <p className="text-xs text-gray-500">자동 취소: <CountdownTimer targetIso={p.autoCancelAt} /></p>
                  </div>
                  <Button onClick={() => setSelected(p)}>수령 완료 처리</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProcessForm({ pickup, onDone }: { pickup: Pickup; onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', contact: '', code: '' });
  const [result, setResult] = useState<{ allMatched: boolean; mismatches: ('name' | 'contact' | 'code')[] } | null>(null);
  const { data: report } = useQuery({ queryKey: ['report', pickup.reportId], queryFn: () => getReport(pickup.reportId) });

  const verifyMut = useMutation({
    mutationFn: () => verifyPickup(pickup.pickupId, form),
    onSuccess: (r) => setResult(r),
    onError: (e: any) => toast(e?.message || '검증 실패', 'error'),
  });

  const completeMut = useMutation({
    mutationFn: () => completePickup(pickup.pickupId),
    onSuccess: () => {
      toast("수령이 완료되었습니다. 분실자에게 물품을 전달한 뒤, '찾기완료 종료 처리' 페이지에서 종료 처리를 진행해주세요.", 'success');
      qc.invalidateQueries();
      onDone();
    },
    onError: (e: any) => toast(e?.message || '실패', 'error'),
  });

  return (
    <Card>
      <h2 className="font-medium mb-2">3중 본인 확인</h2>
      <p className="text-xs text-gray-500 mb-3">분실자가 제시한 정보를 입력하세요. 모두 일치할 때만 완료 처리할 수 있습니다.</p>
      {report && <p className="text-xs text-gray-500 mb-3">대상: {report.itemName} (신고자 {report.reporterName})</p>}
      <div className="space-y-3">
        <Input label="신분증 이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="연락처" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        <Input label="수령 코드 (6자리)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
      </div>
      <div className="flex gap-2 mt-3">
        <Button variant="secondary" onClick={() => verifyMut.mutate()}>검증</Button>
        <Button disabled={!result?.allMatched} onClick={() => completeMut.mutate()}>수령 완료 확정</Button>
        <Button variant="tertiary" onClick={onDone}>목록으로</Button>
      </div>
      {result && (
        <div className="mt-3 p-3 rounded text-sm border" style={{
          borderColor: result.allMatched ? '#86efac' : '#fca5a5',
          backgroundColor: result.allMatched ? '#f0fdf4' : '#fef2f2',
        }}>
          {result.allMatched ? (
            <p className="text-green-800">3가지 모두 일치합니다. '수령 완료 확정' 버튼을 눌러주세요.</p>
          ) : (
            <ul className="text-red-700 space-y-0.5">
              {result.mismatches.includes('name') && <li>• 이름이 일치하지 않습니다</li>}
              {result.mismatches.includes('contact') && <li>• 연락처가 일치하지 않습니다</li>}
              {result.mismatches.includes('code') && <li>• 수령 코드가 일치하지 않습니다</li>}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
