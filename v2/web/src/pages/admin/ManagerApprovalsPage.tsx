import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listPendingManagers, approveManager, rejectManager } from '@/api/admin';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { toast } from '@/store/toastStore';

export function ManagerApprovalsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['pending-managers'],
    queryFn: listPendingManagers,
  });

  const approveMut = useMutation({
    mutationFn: approveManager,
    onSuccess: () => {
      toast('관리자 계정이 승인되었습니다.', 'success');
      qc.invalidateQueries({ queryKey: ['pending-managers'] });
    },
    onError: (e: any) => toast(e?.message || '승인 실패', 'error'),
  });

  const rejectMut = useMutation({
    mutationFn: rejectManager,
    onSuccess: () => {
      toast('관리자 계정이 거절되었습니다.', 'info');
      qc.invalidateQueries({ queryKey: ['pending-managers'] });
    },
    onError: (e: any) => toast(e?.message || '거절 실패', 'error'),
  });

  if (isLoading) return <Spinner />;
  if (!data || data.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-4">보관소 관리자 승인</h1>
        <EmptyState title="승인 대기 중인 계정이 없습니다" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">보관소 관리자 승인</h1>
      <p className="text-sm text-gray-600 mb-4">보관소 관리자 계정 신청 목록입니다. 검토 후 승인 또는 거절하세요.</p>
      <div className="flex flex-col gap-3">
        {data.map((user) => (
          <Card key={user.userId}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-500">연락처: {user.contact}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => approveMut.mutate(user.userId)}
                  disabled={approveMut.isPending || rejectMut.isPending}
                >
                  승인
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => rejectMut.mutate(user.userId)}
                  disabled={approveMut.isPending || rejectMut.isPending}
                >
                  거절
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
