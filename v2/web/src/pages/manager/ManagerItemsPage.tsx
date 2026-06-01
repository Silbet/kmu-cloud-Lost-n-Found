import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listAllItems, setItemStatus, setItemStorage } from '@/api/items';
import { cancelPickup, listWaitingPickups } from '@/api/pickups';
import { Card } from '@/components/common/Card';
import { Spinner } from '@/components/common/Spinner';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { CATEGORIES } from '@/utils/categories';
import { fmtDateTime } from '@/utils/date';
import { toast } from '@/store/toastStore';
import type { FoundItem, FoundItemStatus } from '@/types';

const STATUS_OPTIONS: FoundItemStatus[] = ['등록', '보관중', '수령대기', '수령완료', '폐기예정'];

export function ManagerItemsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['all-items'], queryFn: listAllItems });
  const { data: pickups } = useQuery({ queryKey: ['waiting-pickups'], queryFn: listWaitingPickups });

  const [filters, setFilters] = useState({ category: '', status: '', storageLocation: '' });
  const [storageDialog, setStorageDialog] = useState<{ item: FoundItem; value: string } | null>(null);
  const [statusDialog, setStatusDialog] = useState<{ item: FoundItem; value: FoundItemStatus } | null>(null);
  const [cancelDialog, setCancelDialog] = useState<FoundItem | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((it) =>
      (!filters.category || it.category === filters.category) &&
      (!filters.status || it.status === filters.status) &&
      (!filters.storageLocation || (it.storageLocation ?? '').includes(filters.storageLocation))
    );
  }, [data, filters]);

  const storageMut = useMutation({
    mutationFn: ({ itemId, value }: { itemId: string; value: string }) => setItemStorage(itemId, value),
    onSuccess: () => {
      toast('보관 위치가 저장되었습니다.', 'success');
      qc.invalidateQueries();
      setStorageDialog(null);
    },
    onError: (e: any) => toast(e?.message || '실패', 'error'),
  });

  const statusMut = useMutation({
    mutationFn: ({ itemId, value }: { itemId: string; value: FoundItemStatus }) => setItemStatus(itemId, value),
    onSuccess: () => {
      toast('상태가 변경되었습니다.', 'success');
      qc.invalidateQueries();
      setStatusDialog(null);
    },
    onError: (e: any) => toast(e?.message || '실패', 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: (pickupId: string) => cancelPickup(pickupId, '관리자취소'),
    onSuccess: () => {
      toast('수령 대기가 취소되었습니다.', 'success');
      qc.invalidateQueries();
      setCancelDialog(null);
    },
    onError: (e: any) => toast(e?.message || '실패', 'error'),
  });

  if (isLoading) return <Spinner />;

  function findPickupForItem(itemId: string) {
    return pickups?.find((p) => p.itemId === itemId);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">전체 습득물 관리</h1>
      <Card className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select
            label="카테고리"
            options={[{ value: '', label: '전체' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          />
          <Select
            label="상태"
            options={[{ value: '', label: '전체' }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: s }))]}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          />
          <Input
            label="보관 위치"
            value={filters.storageLocation}
            onChange={(e) => setFilters({ ...filters, storageLocation: e.target.value })}
            placeholder="예: A-12"
          />
        </div>
      </Card>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">물품명</th>
              <th className="text-left px-4 py-2 font-medium">카테고리</th>
              <th className="text-left px-4 py-2 font-medium">습득 일시</th>
              <th className="text-left px-4 py-2 font-medium">상태</th>
              <th className="text-left px-4 py-2 font-medium">보관 위치</th>
              <th className="text-left px-4 py-2 font-medium">액션</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => (
              <tr key={it.itemId} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium">{it.itemName}</td>
                <td className="px-4 py-2">{it.category}</td>
                <td className="px-4 py-2">{fmtDateTime(it.foundDate)}</td>
                <td className="px-4 py-2"><StatusBadge status={it.status} /></td>
                <td className="px-4 py-2">{it.storageLocation ?? '-'}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {it.status === '등록' && (
                      <Button size="sm" onClick={() => setStorageDialog({ item: it, value: '' })}>
                        보관 위치 입력
                      </Button>
                    )}
                    {it.status === '보관중' && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setStorageDialog({ item: it, value: it.storageLocation ?? '' })}
                        >
                          위치 변경
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setStatusDialog({ item: it, value: '폐기예정' })}
                        >
                          폐기예정
                        </Button>
                      </>
                    )}
                    {it.status === '폐기예정' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setStatusDialog({ item: it, value: '보관중' })}
                      >
                        폐기예정 취소
                      </Button>
                    )}
                    {it.status === '수령대기' && findPickupForItem(it.itemId) && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setCancelDialog(it)}
                      >
                        수령 대기 강제 취소
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!storageDialog}
        onClose={() => setStorageDialog(null)}
        title="보관 위치 입력"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStorageDialog(null)}>취소</Button>
            <Button
              disabled={!storageDialog?.value || storageMut.isPending}
              onClick={() =>
                storageDialog && storageMut.mutate({ itemId: storageDialog.item.itemId, value: storageDialog.value })
              }
            >
              저장
            </Button>
          </>
        }
      >
        <p className="text-xs text-gray-500 mb-2">
          위치 입력 시 자동으로 '보관중' 상태로 전환되며 매칭이 트리거됩니다.
        </p>
        <Input
          label="보관 위치"
          value={storageDialog?.value ?? ''}
          onChange={(e) => storageDialog && setStorageDialog({ ...storageDialog, value: e.target.value })}
          placeholder="예: 보관함 A-12"
        />
      </Modal>

      <Modal
        open={!!statusDialog}
        onClose={() => setStatusDialog(null)}
        title="상태 변경"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusDialog(null)}>취소</Button>
            <Button
              disabled={statusMut.isPending}
              onClick={() =>
                statusDialog && statusMut.mutate({ itemId: statusDialog.item.itemId, value: statusDialog.value })
              }
            >
              변경
            </Button>
          </>
        }
      >
        '{statusDialog?.item.itemName}' 의 상태를 <strong>{statusDialog?.value}</strong>로 변경합니다.
      </Modal>

      <Modal
        open={!!cancelDialog}
        onClose={() => setCancelDialog(null)}
        title="수령 대기 강제 취소"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelDialog(null)}>닫기</Button>
            <Button
              variant="danger"
              disabled={cancelMut.isPending}
              onClick={() => {
                if (!cancelDialog) return;
                const p = findPickupForItem(cancelDialog.itemId);
                if (p) cancelMut.mutate(p.pickupId);
              }}
            >
              강제 취소
            </Button>
          </>
        }
      >
        분실자가 연락 두절 등의 사유로 수령 대기를 취소합니다. 매칭은 다시 활성화됩니다.
      </Modal>
    </div>
  );
}
