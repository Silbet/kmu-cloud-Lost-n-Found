import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { cancelPickup, getPickup } from '@/api/pickups';
import { listAllItems } from '@/api/items';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { CountdownTimer } from '@/components/domain/CountdownTimer';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { toast } from '@/store/toastStore';

export function PickupPage() {
  const { pickupId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);

  const { data: pickup, isLoading } = useQuery({ queryKey: ['pickup', pickupId], queryFn: () => getPickup(pickupId) });
  const { data: items } = useQuery({ queryKey: ['all-items'], queryFn: listAllItems });
  const { data: config } = useSystemConfig();

  const cancelMut = useMutation({
    mutationFn: () => cancelPickup(pickupId, '분실자취소'),
    onSuccess: () => {
      toast('수령 대기가 취소되었습니다.', 'success');
      qc.invalidateQueries();
      if (pickup) navigate(`/reports/${pickup.reportId}`);
    },
    onError: (e: any) => toast(e?.message || '취소 실패', 'error'),
  });

  if (isLoading || !pickup) return <Spinner />;
  const item = items?.find((i) => i.itemId === pickup.itemId);

  if (pickup.status !== '수령대기') {
    return (
      <Card>
        <p className="text-sm text-gray-700">
          이 수령은 더 이상 대기 상태가 아닙니다. (현재 상태: <strong>{pickup.status}</strong>)
        </p>
        <Link to="/" className="text-blue-600 hover:underline text-sm mt-2 inline-block">홈으로</Link>
      </Card>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <h1 className="text-lg font-semibold mb-3 text-center">수령 코드</h1>
        <div className="text-center">
          <p className="text-4xl font-bold tracking-widest text-gray-900">{pickup.pickupCode}</p>
          <div className="flex justify-center mt-4">
            <QRCodeSVG value={pickup.pickupCode} size={128} />
          </div>
        </div>
        <div className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">보관 위치</span><span className="font-medium">{item?.storageLocation ?? '-'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">자동 취소까지</span><CountdownTimer targetIso={pickup.autoCancelAt} /></div>
        </div>
        <div className="mt-6 text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded">
          <p>• 보관소 방문 시 <strong>신분증</strong>과 이 화면을 제시해주세요.</p>
          <p>• <strong>대리 수령은 불가합니다. 분실자 본인만 수령 가능합니다.</strong></p>
          <p>• 수령 대기 {config?.pickupAutoCancelDays ?? 3}일이 경과하면 자동 취소됩니다.</p>
        </div>
        <div className="mt-4">
          <Button variant="danger" className="w-full" onClick={() => setShowCancel(true)}>수령 대기 취소</Button>
        </div>
      </Card>

      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="수령 대기 취소"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCancel(false)}>닫기</Button>
            <Button variant="danger" onClick={() => { setShowCancel(false); cancelMut.mutate(); }}>취소 확정</Button>
          </>
        }
      >
        수령 대기를 취소하면 해당 매칭이 다시 활성화되어 다른 후보를 확인 요청할 수 있습니다. 계속하시겠습니까?
      </Modal>
    </div>
  );
}
