import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminListReports } from '@/api/admin';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Spinner } from '@/components/common/Spinner';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { fmtDateTime } from '@/utils/date';
import type { LostReportStatus } from '@/types';

const STATUSES: LostReportStatus[] = ['접수', '매칭후보있음', '찾기완료', '종료'];

export function AdminReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') ?? '';

  const { data, isLoading } = useQuery({ queryKey: ['admin-reports'], queryFn: adminListReports });
  const [filters, setFilters] = useState({ status: initialStatus, keyword: '' });

  function updateStatus(status: string) {
    setFilters((f) => ({ ...f, status }));
    if (status) setSearchParams({ status });
    else setSearchParams({});
  }

  const list = useMemo(() => {
    if (!data) return [];
    return data.filter((r) =>
      (!filters.status || r.status === filters.status) &&
      (!filters.keyword ||
        r.itemName.includes(filters.keyword) ||
        r.reporterName.includes(filters.keyword))
    );
  }, [data, filters]);

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">
        전체 분실 신고
        {filters.status && (
          <span className="ml-2 text-sm font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {filters.status}
          </span>
        )}
      </h1>
      <Card className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="상태"
            options={[{ value: '', label: '전체' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
            value={filters.status}
            onChange={(e) => updateStatus(e.target.value)}
          />
          <Input
            label="검색 (물품명 / 신고자)"
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          />
        </div>
      </Card>
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">신고자</th>
              <th className="text-left px-4 py-2 font-medium">연락처</th>
              <th className="text-left px-4 py-2 font-medium">물품명</th>
              <th className="text-left px-4 py-2 font-medium">카테고리</th>
              <th className="text-left px-4 py-2 font-medium">장소</th>
              <th className="text-left px-4 py-2 font-medium">분실 일시</th>
              <th className="text-left px-4 py-2 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.reportId} className="border-t border-gray-100">
                <td className="px-4 py-2">{r.reporterName}</td>
                <td className="px-4 py-2">{r.reporterContact}</td>
                <td className="px-4 py-2 font-medium">{r.itemName}</td>
                <td className="px-4 py-2">{r.category}</td>
                <td className="px-4 py-2">{r.lostPlace || '-'}</td>
                <td className="px-4 py-2">{fmtDateTime(r.lostDate)}</td>
                <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                  해당하는 신고가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
