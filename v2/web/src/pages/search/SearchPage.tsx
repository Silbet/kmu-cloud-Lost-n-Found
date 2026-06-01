import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { searchFound, searchLost, type SearchParams } from '@/api/search';
import { listMyReports } from '@/api/reports';
import { claimFoundItem } from '@/api/matches';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { CATEGORIES } from '@/utils/categories';
import { fmtDateTime } from '@/utils/date';
import { maskName, maskContact } from '@/utils/mask';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import type { LostReport, FoundItem } from '@/types';

const LOST_STATUSES = ['접수', '매칭후보있음', '찾기완료', '종료'];
const FOUND_STATUSES = ['등록', '보관중', '수령대기', '수령완료', '폐기예정'];

const STATUS_LEGEND = [
  { status: '접수', desc: '신고만 접수된 상태' },
  { status: '매칭후보있음', desc: '매칭 후보가 발견됨' },
  { status: '찾기완료', desc: '분실물을 찾았습니다' },
  { status: '종료', desc: '처리 완료' },
];

const FOUND_STATUS_LEGEND = [
  { status: '등록', desc: '보관소 접수 전' },
  { status: '보관중', desc: '보관소에서 보관 중' },
  { status: '수령대기', desc: '분실자와 매칭, 수령 대기' },
  { status: '수령완료', desc: '분실자가 수령' },
  { status: '폐기예정', desc: '장기 미수령으로 폐기 예정' },
];

export function SearchPage() {
  const [tab, setTab] = useState<'lost' | 'found'>('lost');
  const [filters, setFilters] = useState<SearchParams>({});
  const [draft, setDraft] = useState<SearchParams>({});
  const [selectedLost, setSelectedLost] = useState<LostReport | null>(null);
  const [selectedFound, setSelectedFound] = useState<FoundItem | null>(null);
  // 승인 요청 플로우 상태
  const [claimTarget, setClaimTarget] = useState<FoundItem | null>(null);
  const [selectedReportId, setSelectedReportId] = useState('');

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles.includes('운영관리자');
  const isUser = user?.roles.includes('일반사용자');
  const qc = useQueryClient();

  // 검색 쿼리
  const lostQ = useQuery({
    queryKey: ['search-lost', filters],
    queryFn: () => searchLost(filters),
    enabled: tab === 'lost',
  });
  const foundQ = useQuery({
    queryKey: ['search-found', filters],
    queryFn: () => searchFound(filters),
    enabled: tab === 'found',
  });

  // 일반사용자 본인의 활성 신고 목록 (승인 요청 모달에서 사용)
  const myReportsQ = useQuery({
    queryKey: ['my-reports'],
    queryFn: listMyReports,
    enabled: !!claimTarget && isUser,
  });
  const activeReports = myReportsQ.data?.filter(
    (r) => r.status === '접수' || r.status === '매칭후보있음',
  ) ?? [];

  const claimMut = useMutation({
    mutationFn: () => claimFoundItem(claimTarget!.itemId, selectedReportId),
    onSuccess: () => {
      toast('확인 요청이 전송되었습니다. 보관소 관리자 승인을 기다려주세요.', 'success');
      qc.invalidateQueries({ queryKey: ['my-reports'] });
      setClaimTarget(null);
      setSelectedFound(null);
      setSelectedReportId('');
    },
    onError: (e: any) => toast(e?.message || '요청 실패', 'error'),
  });

  function applyFilters() { setFilters({ ...draft }); }
  function resetFilters() { setDraft({}); setFilters({}); }

  function displayName(name: string) { return isAdmin ? name : maskName(name); }
  function displayContact(contact: string) { return isAdmin ? contact : maskContact(contact); }

  function openClaim(item: FoundItem, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedReportId('');
    setClaimTarget(item);
  }

  return (
    <div>
      {/* 탭 */}
      <div className="flex gap-2 border-b border-gray-200 mb-4">
        <button
          onClick={() => { setTab('lost'); setDraft({}); setFilters({}); }}
          className={`px-4 py-2 text-sm border-b-2 ${tab === 'lost' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600'}`}
        >
          분실물
        </button>
        <button
          onClick={() => { setTab('found'); setDraft({}); setFilters({}); }}
          className={`px-4 py-2 text-sm border-b-2 ${tab === 'found' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600'}`}
        >
          습득물
        </button>
      </div>

      {/* 안내 배너 */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4 text-sm text-blue-800">
        {tab === 'lost' ? (
          <>
            <p className="font-medium">🔍 이걸 잃어버렸어요</p>
            <p className="mt-0.5 text-blue-600">다른 사람이 신고한 분실물을 검색합니다. 내 물건과 비슷한 신고가 있는지 확인해보세요.</p>
          </>
        ) : (
          <>
            <p className="font-medium">📦 이걸 찾았어요</p>
            <p className="mt-0.5 text-blue-600">보관소에 접수된 습득물을 검색합니다. 보관중 물건 중 내 것이 있으면 확인 요청을 보내세요.</p>
          </>
        )}
      </div>

      {/* 필터 */}
      <Card className="mb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Select
            label="상태"
            options={[
              { value: '', label: '전체' },
              ...(tab === 'lost' ? LOST_STATUSES : FOUND_STATUSES).map((s) => ({ value: s, label: s })),
            ]}
            value={draft.status ?? ''}
            onChange={(e) => setDraft({ ...draft, status: e.target.value || undefined })}
          />
          <Select
            label="카테고리"
            options={[{ value: '', label: '전체' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
            value={draft.category ?? ''}
            onChange={(e) => setDraft({ ...draft, category: e.target.value || undefined })}
          />
          <Input label="장소" value={draft.place ?? ''} onChange={(e) => setDraft({ ...draft, place: e.target.value || undefined })} />
          <Input label="시작일" type="date" value={draft.dateFrom ?? ''} onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value || undefined })} />
          <Input label="종료일" type="date" value={draft.dateTo ?? ''} onChange={(e) => setDraft({ ...draft, dateTo: e.target.value || undefined })} />
          <Input label="키워드" value={draft.keyword ?? ''} onChange={(e) => setDraft({ ...draft, keyword: e.target.value || undefined })} />
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="secondary" onClick={resetFilters} className="shrink-0">초기화</Button>
          <Button onClick={applyFilters} className="shrink-0">검색하기</Button>
        </div>
        {!isAdmin && (
          <p className="text-xs text-gray-500 mt-2">※ 신고자/습득자 개인정보는 마스킹되어 표시됩니다.</p>
        )}
      </Card>

      {/* 상태 범례 */}
      <details className="mb-4">
        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">상태 설명 보기</summary>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
          {(tab === 'lost' ? STATUS_LEGEND : FOUND_STATUS_LEGEND).map(({ status, desc }) => (
            <div key={status} className="flex items-center gap-2 text-xs text-gray-600">
              <StatusBadge status={status as any} />
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </details>

      {/* 검색 결과 */}
      {tab === 'lost' ? (
        lostQ.isLoading ? <Spinner /> :
        !lostQ.data || lostQ.data.length === 0 ? <EmptyState title="검색 결과가 없습니다" /> :
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {lostQ.data.map((r) => (
            <button key={r.reportId} onClick={() => setSelectedLost(r)} className="text-left">
              <Card className="hover:border-blue-300 transition cursor-pointer h-full">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium">{r.itemName}</h3>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm text-gray-600 mt-1">{r.category} · {r.lostPlace || '장소 미상'}</p>
                <p className="text-xs text-gray-500 mt-1">{fmtDateTime(r.lostDate)}</p>
                <p className="text-xs text-gray-500 mt-1">신고자: {displayName(r.reporterName)}</p>
              </Card>
            </button>
          ))}
        </div>
      ) : (
        foundQ.isLoading ? <Spinner /> :
        !foundQ.data || foundQ.data.length === 0 ? <EmptyState title="검색 결과가 없습니다" /> :
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {foundQ.data.map((it) => (
            <button key={it.itemId} onClick={() => setSelectedFound(it)} className="text-left w-full">
              <Card className="hover:border-blue-300 transition cursor-pointer h-full">
                {it.imageUrl && (
                  <img src={it.imageUrl} alt="" className="w-full h-32 object-cover rounded mb-2 bg-gray-100" />
                )}
                <div className="flex justify-between items-start">
                  <h3 className="font-medium">{it.itemName}</h3>
                  <StatusBadge status={it.status} />
                </div>
                <p className="text-sm text-gray-600 mt-1">{it.category} · {it.foundPlace}</p>
                <p className="text-xs text-gray-500 mt-1">{fmtDateTime(it.foundDate)}</p>
                {it.finderName && (
                  <p className="text-xs text-gray-500 mt-1">습득자: {displayName(it.finderName)}</p>
                )}
                {/* 보관중 항목에만 내 물건 요청 버튼 표시 (일반사용자 전용) */}
                {isUser && it.status === '보관중' && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={(e) => openClaim(it, e)}
                      className="w-full text-xs text-center font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded px-2 py-1.5 transition"
                    >
                      🙋 내 물건인 것 같아요
                    </button>
                  </div>
                )}
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* ── 분실물 상세 모달 ── */}
      <Modal
        open={!!selectedLost}
        onClose={() => setSelectedLost(null)}
        title="분실물 상세 정보"
        footer={<Button onClick={() => setSelectedLost(null)}>닫기</Button>}
      >
        {selectedLost && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-base">{selectedLost.itemName}</h3>
              <StatusBadge status={selectedLost.status} />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div><dt className="text-xs text-gray-500">카테고리</dt><dd className="font-medium">{selectedLost.category}</dd></div>
              <div><dt className="text-xs text-gray-500">분실 장소</dt><dd className="font-medium">{selectedLost.lostPlace || '-'}</dd></div>
              <div><dt className="text-xs text-gray-500">분실 일시</dt><dd className="font-medium">{fmtDateTime(selectedLost.lostDate)}</dd></div>
              <div><dt className="text-xs text-gray-500">신고 일시</dt><dd className="font-medium">{fmtDateTime(selectedLost.createdAt)}</dd></div>
            </dl>
            {selectedLost.description && (
              <div>
                <p className="text-xs text-gray-500 mb-1">상세 설명</p>
                <p className="text-gray-700 bg-gray-50 rounded p-2">{selectedLost.description}</p>
              </div>
            )}
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">신고자 정보</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div><dt className="text-xs text-gray-400">이름</dt><dd className="font-medium">{displayName(selectedLost.reporterName)}</dd></div>
                <div><dt className="text-xs text-gray-400">연락처</dt><dd className="font-medium">{displayContact(selectedLost.reporterContact)}</dd></div>
              </dl>
            </div>
          </div>
        )}
      </Modal>

      {/* ── 습득물 상세 모달 ── */}
      <Modal
        open={!!selectedFound && !claimTarget}
        onClose={() => setSelectedFound(null)}
        title="습득물 상세 정보"
        footer={
          <div className="flex gap-2 justify-end w-full">
            {isUser && selectedFound?.status === '보관중' && (
              <Button onClick={(e) => openClaim(selectedFound!, e as any)}>
                🙋 내 물건인 것 같아요
              </Button>
            )}
            <Button variant="secondary" onClick={() => setSelectedFound(null)}>닫기</Button>
          </div>
        }
      >
        {selectedFound && (
          <div className="space-y-3 text-sm">
            {selectedFound.imageUrl && (
              <img src={selectedFound.imageUrl} alt="" className="w-full max-h-48 object-cover rounded bg-gray-100" />
            )}
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-base">{selectedFound.itemName}</h3>
              <StatusBadge status={selectedFound.status} />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div><dt className="text-xs text-gray-500">카테고리</dt><dd className="font-medium">{selectedFound.category}</dd></div>
              <div><dt className="text-xs text-gray-500">습득 장소</dt><dd className="font-medium">{selectedFound.foundPlace}</dd></div>
              <div><dt className="text-xs text-gray-500">습득 일시</dt><dd className="font-medium">{fmtDateTime(selectedFound.foundDate)}</dd></div>
              {selectedFound.storageLocation && (
                <div><dt className="text-xs text-gray-500">보관 위치</dt><dd className="font-medium">{selectedFound.storageLocation}</dd></div>
              )}
            </dl>
            {selectedFound.description && (
              <div>
                <p className="text-xs text-gray-500 mb-1">상세 설명</p>
                <p className="text-gray-700 bg-gray-50 rounded p-2">{selectedFound.description}</p>
              </div>
            )}
            {selectedFound.finderName && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">습득자 정보</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div><dt className="text-xs text-gray-400">이름</dt><dd className="font-medium">{displayName(selectedFound.finderName)}</dd></div>
                  {selectedFound.finderContact && (
                    <div><dt className="text-xs text-gray-400">연락처</dt><dd className="font-medium">{displayContact(selectedFound.finderContact)}</dd></div>
                  )}
                </dl>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── 분실 신고 선택 모달 (확인 요청) ── */}
      <Modal
        open={!!claimTarget}
        onClose={() => { setClaimTarget(null); setSelectedReportId(''); }}
        title="확인 요청 — 분실 신고 선택"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setClaimTarget(null); setSelectedReportId(''); }}>
              취소
            </Button>
            <Button
              disabled={!selectedReportId || claimMut.isPending}
              onClick={() => claimMut.mutate()}
            >
              {claimMut.isPending ? '요청 중...' : '확인 요청 보내기'}
            </Button>
          </>
        }
      >
        {claimTarget && (
          <div className="space-y-4 text-sm">
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <p className="font-medium text-blue-800">{claimTarget.itemName}</p>
              <p className="text-xs text-blue-600 mt-0.5">{claimTarget.category} · {claimTarget.foundPlace}</p>
            </div>
            <p className="text-gray-600">
              이 습득물이 내 분실물과 일치한다면, 어떤 분실 신고 건인지 선택해주세요.
              보관소 관리자가 실물을 확인 후 승인하면 수령 코드가 발급됩니다.
            </p>

            {myReportsQ.isLoading ? (
              <div className="py-4 text-center"><Spinner /></div>
            ) : activeReports.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 text-amber-700 text-xs">
                활성 분실 신고가 없습니다. <br />
                먼저 <strong>내 신고 → 새 신고</strong>에서 분실 신고를 등록한 후 요청해주세요.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {activeReports.map((r) => (
                  <label
                    key={r.reportId}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      selectedReportId === r.reportId
                        ? 'bg-blue-50 border-blue-400'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report"
                      value={r.reportId}
                      checked={selectedReportId === r.reportId}
                      onChange={() => setSelectedReportId(r.reportId)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className={`font-medium ${selectedReportId === r.reportId ? 'text-blue-700' : 'text-gray-800'}`}>
                        {r.itemName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.category} · {r.lostPlace || '장소 미상'} · {fmtDateTime(r.lostDate)}
                      </p>
                      <StatusBadge status={r.status} />
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
