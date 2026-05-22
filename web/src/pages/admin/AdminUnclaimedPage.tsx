import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminUnclaimed } from '@/api/admin';
import { setItemStatus } from '@/api/items';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { fmtDateTime } from '@/utils/date';
import { toast } from '@/store/toastStore';

export function AdminUnclaimedPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-unclaimed'], queryFn: adminUnclaimed });
  const mut = useMutation({
    mutationFn: (itemId: string) => setItemStatus(itemId, '폐기예정'),
    onSuccess: () => { toast('폐기예정으로 변경했습니다.', 'success'); qc.invalidateQueries(); },
    onError: (e: any) => toast(e?.message || '실패', 'error'),
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">장기 미수령</h1>
      <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded p-2 mb-4">
        장기 미수령 = 폐기 검토 대기 (동의어). 폐기예정 전환은 자동이 아닌 <strong>수동</strong>으로만 처리됩니다.
      </p>
      {!data || data.length === 0 ? <EmptyState title="장기 미수령 물품이 없습니다" /> : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">물품명</th>
                <th className="text-left px-4 py-2 font-medium">카테고리</th>
                <th className="text-left px-4 py-2 font-medium">보관 위치</th>
                <th className="text-left px-4 py-2 font-medium">등록 일시</th>
                <th className="text-left px-4 py-2 font-medium">경과 일수</th>
                <th className="text-left px-4 py-2 font-medium">상태</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((i) => {
                const days = Math.floor((Date.now() - new Date(i.createdAt).getTime()) / 86400000);
                return (
                  <tr key={i.itemId} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium">{i.itemName}</td>
                    <td className="px-4 py-2">{i.category}</td>
                    <td className="px-4 py-2">{i.storageLocation ?? '-'}</td>
                    <td className="px-4 py-2">{fmtDateTime(i.createdAt)}</td>
                    <td className="px-4 py-2 text-red-600">{days}일</td>
                    <td className="px-4 py-2"><StatusBadge status={i.status} /></td>
                    <td className="px-4 py-2 text-right">
                      <Button size="sm" variant="danger" onClick={() => mut.mutate(i.itemId)}>폐기예정으로 변경</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
