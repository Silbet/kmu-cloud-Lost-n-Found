import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listAllItems } from '@/api/items';
import { listPendingConfirmations } from '@/api/matches';
import { adminListReports, adminUnclaimed } from '@/api/admin';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';

export function ManagerDashboard() {
  const items = useQuery({ queryKey: ['all-items'], queryFn: listAllItems });
  const confirms = useQuery({ queryKey: ['pending-confirmations'], queryFn: listPendingConfirmations });
  const reports = useQuery({ queryKey: ['admin-reports'], queryFn: adminListReports });
  const unclaimed = useQuery({ queryKey: ['admin-unclaimed'], queryFn: adminUnclaimed });

  if (items.isLoading || confirms.isLoading || reports.isLoading || unclaimed.isLoading) return <Spinner />;

  const inStorage = items.data?.filter((i) => i.status === '보관중').length ?? 0;
  const waiting = items.data?.filter((i) => i.status === '수령대기').length ?? 0;
  const finalizePending = reports.data?.filter((r) => r.status === '찾기완료').length ?? 0;
  const confirmCount = confirms.data?.length ?? 0;
  const unclaimedCount = unclaimed.data?.length ?? 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">보관소 관리자 대시보드</h1>
        <Link to="/manager/settings">
          <Button size="sm" variant="secondary">⚙️ 설정</Button>
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="보관중" value={inStorage} to="/manager/items" />
        <Stat label="수령대기" value={waiting} to="/manager/pickups" />
        <Stat label="확인요청 대기" value={confirmCount} to="/manager/confirmations" />
        <Stat label="장기 미수령" value={unclaimedCount} to="/manager/items" tone={unclaimedCount > 0 ? 'red' : 'default'} />
        <Stat label="종료 처리 대기" value={finalizePending} to="/manager/finalize" />
      </div>
    </div>
  );
}

function Stat({ label, value, to, tone = 'default' }: { label: string; value: number; to: string; tone?: 'default' | 'red' }) {
  return (
    <Link to={to}>
      <Card className="hover:border-blue-300 transition">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-2xl font-semibold mt-1 ${tone === 'red' ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
      </Card>
    </Link>
  );
}
