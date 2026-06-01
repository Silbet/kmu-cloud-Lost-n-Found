import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getConfig, updateConfig } from '@/api/admin';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { toast } from '@/store/toastStore';

export function ManagerSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['system-config'], queryFn: getConfig });

  const [longUnclaimedDays, setLongUnclaimedDays] = useState(30);
  const [pickupAutoCancelDays, setPickupAutoCancelDays] = useState(3);
  const [matchDateRangeDays, setMatchDateRangeDays] = useState(7);

  useEffect(() => {
    if (data) {
      setLongUnclaimedDays(data.longUnclaimedDays);
      setPickupAutoCancelDays(data.pickupAutoCancelDays);
      setMatchDateRangeDays(data.matchDateRangeDays);
    }
  }, [data]);

  const updateMut = useMutation({
    mutationFn: updateConfig,
    onSuccess: () => {
      toast('설정이 저장되었습니다.', 'success');
      qc.invalidateQueries({ queryKey: ['system-config'] });
    },
    onError: (e: any) => toast(e?.message || '저장 실패', 'error'),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMut.mutate({ longUnclaimedDays, pickupAutoCancelDays, matchDateRangeDays });
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-semibold mb-4">보관소 설정</h1>
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              장기 미수령 기준 (일)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              이 기간 이상 수령되지 않은 습득물을 '장기 미수령'으로 분류합니다.
            </p>
            <input
              type="number"
              min={1}
              max={365}
              value={longUnclaimedDays}
              onChange={(e) => setLongUnclaimedDays(Number(e.target.value))}
              className="w-28 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500 ml-2">일</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              수령 자동 취소 기준 (일)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              수령 대기 상태에서 이 기간 내 수령하지 않으면 자동 취소됩니다.
            </p>
            <input
              type="number"
              min={1}
              max={30}
              value={pickupAutoCancelDays}
              onChange={(e) => setPickupAutoCancelDays(Number(e.target.value))}
              className="w-28 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500 ml-2">일</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              매칭 날짜 범위 (일)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              분실 신고와 습득물의 날짜 차이가 이 범위 내일 때 매칭 후보로 포함합니다.
            </p>
            <input
              type="number"
              min={1}
              max={30}
              value={matchDateRangeDays}
              onChange={(e) => setMatchDateRangeDays(Number(e.target.value))}
              className="w-28 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500 ml-2">일</span>
          </div>

          <div className="border-t pt-4 flex justify-end">
            <Button type="submit" disabled={updateMut.isPending}>
              {updateMut.isPending ? '저장 중...' : '설정 저장'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
