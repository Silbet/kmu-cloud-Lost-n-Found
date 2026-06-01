import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getConfig, updateConfig } from '@/api/admin';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { toast } from '@/store/toastStore';

export function AdminSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['systemConfig'], queryFn: getConfig });
  const [form, setForm] = useState({ longUnclaimedDays: 30, pickupAutoCancelDays: 3, matchDateRangeDays: 7 });
  const [confirm, setConfirm] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const mut = useMutation({
    mutationFn: () => updateConfig(form),
    onSuccess: () => {
      toast('전체 시스템 정책이 새 값으로 즉시 적용됩니다.', 'success');
      qc.invalidateQueries({ queryKey: ['systemConfig'] });
      setConfirm(false);
    },
    onError: (e: any) => toast(e?.message || '실패', 'error'),
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-4">시스템 설정</h1>
      <Card>
        <div className="space-y-3">
          <Input label="장기 미수령 기준 (일)" type="number" min={1} value={form.longUnclaimedDays} onChange={(e) => setForm({ ...form, longUnclaimedDays: Number(e.target.value) })} />
          <Input label="수령 대기 자동 취소 기준 (일)" type="number" min={1} value={form.pickupAutoCancelDays} onChange={(e) => setForm({ ...form, pickupAutoCancelDays: Number(e.target.value) })} />
          <Input label="매칭 시 날짜 근접 허용 (일)" type="number" min={1} value={form.matchDateRangeDays} onChange={(e) => setForm({ ...form, matchDateRangeDays: Number(e.target.value) })} />
        </div>
        <div className="mt-4">
          <Button onClick={() => setConfirm(true)}>저장</Button>
        </div>
      </Card>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="설정 변경 확인"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>취소</Button>
            <Button onClick={() => mut.mutate()}>저장 확정</Button>
          </>
        }
      >
        변경된 값을 저장하시겠습니까? 새 값은 즉시 시스템 전체에 적용됩니다.
      </Modal>
    </div>
  );
}
