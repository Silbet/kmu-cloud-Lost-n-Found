import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteItem, listMyItems } from '@/api/items';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { fmtDateTime } from '@/utils/date';
import { toast } from '@/store/toastStore';

export function MyItemsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['my-items'], queryFn: listMyItems });
  const del = useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: () => { toast('삭제되었습니다.', 'success'); qc.invalidateQueries({ queryKey: ['my-items'] }); },
    onError: (e: any) => toast(e?.message || '삭제 실패', 'error'),
  });

  if (isLoading) return <Spinner />;
  if (!data || data.length === 0) return <EmptyState title="등록한 습득물이 없습니다" action={<Link to="/items/new"><Button>등록하기</Button></Link>} />;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-semibold">내 등록 습득물</h1>
        <Link to="/items/new"><Button size="sm">새 등록</Button></Link>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">물품명</th>
              <th className="text-left px-4 py-2 font-medium">카테고리</th>
              <th className="text-left px-4 py-2 font-medium">습득 장소</th>
              <th className="text-left px-4 py-2 font-medium">습득 일시</th>
              <th className="text-left px-4 py-2 font-medium">상태</th>
              <th className="text-left px-4 py-2 font-medium">보관 위치</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((it) => (
              <tr key={it.itemId} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium">{it.itemName}</td>
                <td className="px-4 py-2">{it.category}</td>
                <td className="px-4 py-2">{it.foundPlace}</td>
                <td className="px-4 py-2">{fmtDateTime(it.foundDate)}</td>
                <td className="px-4 py-2"><StatusBadge status={it.status} /></td>
                <td className="px-4 py-2">{it.storageLocation ?? '-'}</td>
                <td className="px-4 py-2 text-right">
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={it.status !== '등록'}
                    onClick={() => del.mutate(it.itemId)}
                    title={it.status !== '등록' ? '보관 위치가 입력된 후에는 삭제할 수 없습니다.' : ''}
                  >
                    삭제
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
