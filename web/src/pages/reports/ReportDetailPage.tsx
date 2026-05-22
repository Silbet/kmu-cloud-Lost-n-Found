import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteLostReport, getReport, updateLostReport } from '@/api/reports';
import { confirmMatch, listMatchesForReport } from '@/api/matches';
import { getPickupByReport } from '@/api/pickups';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Textarea } from '@/components/common/Textarea';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { CATEGORIES } from '@/utils/categories';
import { fmtDateTime, toLocalDatetimeValue } from '@/utils/date';
import { toast } from '@/store/toastStore';

export function ReportDetailPage() {
  const { reportId = '' } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmMatchId, setConfirmMatchId] = useState<string | null>(null);

  const { data: report, isLoading } = useQuery({ queryKey: ['report', reportId], queryFn: () => getReport(reportId) });
  const { data: matches } = useQuery({ queryKey: ['matches', reportId], queryFn: () => listMatchesForReport(reportId) });

  // 이미 승인됐거나 처리 중인 매칭이 있으면 추가 확인 요청 불가
  const hasActiveConfirm = !!matches?.some((m) => m.status === '확인요청중' || m.status === '승인');
  const isEditable = !!report && (report.status === '접수' || report.status === '매칭후보있음') && !hasActiveConfirm;
  const finalState = !!report && (report.status === '찾기완료' || report.status === '종료');

  const disabledReason = finalState
    ? '이미 처리된 신고는 수정할 수 없습니다.'
    : hasActiveConfirm
    ? '확인 요청 진행 중에는 신고를 수정할 수 없습니다. 승인 또는 반려 후 다시 시도해주세요.'
    : '';

  const updateMutation = useMutation({
    mutationFn: (patch: any) => updateLostReport(reportId, patch),
    onSuccess: () => {
      toast('수정사항이 저장되었습니다. 매칭 후보가 다시 계산됩니다. 기존 매칭 후보가 새 입력에 맞지 않으면 사라질 수 있습니다.', 'success');
      qc.invalidateQueries({ queryKey: ['report', reportId] });
      qc.invalidateQueries({ queryKey: ['matches', reportId] });
      setEditing(false);
    },
    onError: (e: any) => toast(e?.message || '수정 실패', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLostReport(reportId),
    onSuccess: () => {
      toast('신고가 삭제되었습니다.', 'success');
      navigate('/reports/my');
    },
    onError: (e: any) => toast(e?.message || '삭제 실패', 'error'),
  });

  const confirmMatchMutation = useMutation({
    mutationFn: (mid: string) => confirmMatch(mid),
    onSuccess: () => {
      toast('확인 요청이 전송되었습니다.', 'success');
      qc.invalidateQueries({ queryKey: ['matches', reportId] });
      qc.invalidateQueries({ queryKey: ['report', reportId] });
      setConfirmMatchId(null);
    },
    onError: (e: any) => { toast(e?.message || '요청 실패', 'error'); setConfirmMatchId(null); },
  });

  if (isLoading || !report) return <Spinner />;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-semibold">분실 신고 상세</h1>
        <StatusBadge status={report.status} />
      </div>

      {editing ? (
        <EditForm
          initial={report}
          onCancel={() => setEditing(false)}
          onSubmit={(patch) => updateMutation.mutate(patch)}
          loading={updateMutation.isPending}
        />
      ) : (
        <Card>
          <DetailRow label="물품명" value={report.itemName} />
          <DetailRow label="카테고리" value={report.category} />
          <DetailRow label="분실 장소" value={report.lostPlace} />
          <DetailRow label="분실 일시" value={fmtDateTime(report.lostDate)} />
          <DetailRow label="상세 설명" value={report.description || '-'} />
          <DetailRow label="연락처" value={report.reporterContact} />
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" disabled={!isEditable} onClick={() => setEditing(true)} title={disabledReason}>수정</Button>
            <Button variant="danger" disabled={!isEditable} onClick={() => setConfirmDelete(true)} title={disabledReason}>삭제</Button>
            {!isEditable && disabledReason && <span className="text-xs text-gray-500 self-center">{disabledReason}</span>}
          </div>
        </Card>
      )}

      <h2 className="text-lg font-semibold mt-8 mb-3">매칭 후보</h2>
      {!matches || matches.length === 0 ? (
        <p className="text-sm text-gray-500">매칭 후보가 아직 없습니다. 새 매칭이 생기면 알림으로 알려드립니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {matches.map((m) => (
            <Card key={m.matchId} className={m.status === '비활성' ? 'opacity-60' : ''}>
              {m.item.imageUrl && <img src={m.item.imageUrl} alt="" className="w-full h-32 object-cover rounded mb-2 bg-gray-100" />}
              <div className="flex justify-between items-start">
                <h3 className="font-medium">{m.item.itemName}</h3>
                <StatusBadge status={m.status} />
              </div>
              <p className="text-sm text-gray-600 mt-1">{m.item.category} · {m.item.foundPlace}</p>
              <p className="text-xs text-gray-500 mt-1">{fmtDateTime(m.item.foundDate)}</p>
              {m.status === '반려' && m.rejectReason && (
                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
                  관리자 반려: {m.rejectReason}
                </div>
              )}
              <div className="mt-3">
                {m.status === '활성' && (
                  <Button
                    size="sm"
                    disabled={hasActiveConfirm || finalState}
                    onClick={() => setConfirmMatchId(m.matchId)}
                    title={
                      finalState ? '이미 처리 완료된 신고입니다.' :
                      hasActiveConfirm ? '이미 진행 중인 확인 요청이 있습니다. 처리 후 다시 시도해주세요.' : ''
                    }
                  >
                    확인 요청
                  </Button>
                )}
                {m.status === '확인요청중' && <span className="text-sm text-amber-700">처리 대기 중</span>}
                {m.status === '승인' && (
                  <PickupLink reportId={reportId} />
                )}
                {m.status === '반려' && (
                  <Button
                    size="sm"
                    disabled={hasActiveConfirm || finalState}
                    onClick={() => setConfirmMatchId(m.matchId)}
                    title={
                      finalState ? '이미 처리 완료된 신고입니다.' :
                      hasActiveConfirm ? '이미 진행 중인 확인 요청이 있습니다.' : ''
                    }
                  >
                    재확인 요청
                  </Button>
                )}
                {m.status === '비활성' && <span className="text-xs text-gray-500">수령 완료로 종료된 매칭</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
      {hasActiveConfirm && (
        <p className="text-xs text-gray-500 mt-3">※ 이미 진행 중인 확인 요청이 있어 다른 매칭에는 요청할 수 없습니다.</p>
      )}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="삭제 확인"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>취소</Button>
            <Button variant="danger" onClick={() => { setConfirmDelete(false); deleteMutation.mutate(); }}>삭제</Button>
          </>
        }
      >
        관련 매칭 후보도 함께 삭제됩니다. 연결된 습득물은 다시 '보관중' 상태로 돌아갑니다. 계속하시겠습니까?
      </Modal>

      <Modal
        open={!!confirmMatchId}
        onClose={() => setConfirmMatchId(null)}
        title="확인 요청"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmMatchId(null)}>취소</Button>
            <Button onClick={() => confirmMatchMutation.mutate(confirmMatchId!)}>요청 전송</Button>
          </>
        }
      >
        보관소 관리자에게 확인 요청을 보냅니다. 승인되면 수령 코드가 발급됩니다.
      </Modal>
    </div>
  );
}

/** 승인된 매칭 → pickup 조회 후 수령 코드 페이지 링크 표시 */
function PickupLink({ reportId }: { reportId: string }) {
  const { data: pickup } = useQuery({
    queryKey: ['pickup-by-report', reportId],
    queryFn: () => getPickupByReport(reportId),
  });

  if (!pickup) return <span className="text-sm text-green-700">승인됨 — 수령 코드 로딩 중...</span>;

  return (
    <Link
      to={`/pickups/${pickup.pickupId}`}
      className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:underline"
    >
      ✅ 승인됨 — 수령 코드 확인 · 취소
    </Link>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex border-b border-gray-100 py-2 text-sm">
      <div className="w-32 text-gray-500">{label}</div>
      <div className="flex-1 text-gray-900">{value}</div>
    </div>
  );
}

function EditForm({ initial, onCancel, onSubmit, loading }: {
  initial: import('@/types').LostReport;
  onCancel: () => void;
  onSubmit: (patch: any) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    itemName: initial.itemName,
    category: initial.category,
    lostPlace: initial.lostPlace,
    lostDate: toLocalDatetimeValue(initial.lostDate),
    description: initial.description,
    reporterContact: initial.reporterContact,
  });
  return (
    <Card>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, lostDate: new Date(form.lostDate).toISOString() }); }}>
        <Input label="물품명" value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} required />
        <Select label="카테고리" options={CATEGORIES.map((c) => ({ value: c, label: c }))} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <Input label="분실 장소" value={form.lostPlace} onChange={(e) => setForm({ ...form, lostPlace: e.target.value })} required />
        <Input label="분실 일시" type="datetime-local" value={form.lostDate} onChange={(e) => setForm({ ...form, lostDate: e.target.value })} required />
        <Textarea label="상세 설명" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Input label="연락처" value={form.reporterContact} onChange={(e) => setForm({ ...form, reporterContact: e.target.value })} required />
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? '저장 중...' : '저장'}</Button>
          <Button type="button" variant="secondary" onClick={onCancel}>취소</Button>
        </div>
      </form>
    </Card>
  );
}
