import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listNotifications, markAllRead, markRead } from '@/api/notifications';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { fmtRelative } from '@/utils/date';
import type { NotificationType } from '@/types';

const ICON: Record<NotificationType, string> = {
  매칭후보생성: '🔍',
  확인요청승인: '✅',
  확인요청반려: '❌',
  수령자동취소임박: '⏰',
  수령대기취소: '↩️',
  폐기검토필요: '⚠️',
  보관소관리자승인요청: '👤',
};

export function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: listNotifications });
  const markOne = useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unread-count'] }); },
  });
  const markAll = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unread-count'] }); },
  });

  if (isLoading) return <Spinner />;
  if (!data || data.length === 0) return <EmptyState title="알림이 없습니다" />;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-semibold">알림</h1>
        <Button variant="secondary" size="sm" onClick={() => markAll.mutate()}>모두 읽음 표시</Button>
      </div>
      <div className="space-y-2">
        {data.map((n) => {
          const Inner = (
            <Card className={`${n.isRead ? 'bg-gray-50' : 'bg-white'} cursor-pointer hover:border-gray-300`}>
              <div className="flex items-start gap-3">
                <span className="text-xl">{ICON[n.type]}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline">
                    <p className={`text-sm ${n.isRead ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</p>
                    <span className="text-xs text-gray-500">{fmtRelative(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                </div>
              </div>
            </Card>
          );
          const onClick = () => { if (!n.isRead) markOne.mutate(n.notificationId); };
          return n.link ? (
            <Link key={n.notificationId} to={n.link} onClick={onClick}>{Inner}</Link>
          ) : (
            <div key={n.notificationId} onClick={onClick}>{Inner}</div>
          );
        })}
      </div>
    </div>
  );
}
