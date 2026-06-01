import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminListItems } from '@/api/admin';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Spinner } from '@/components/common/Spinner';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { fmtDateTime } from '@/utils/date';
import type { FoundItemStatus } from '@/types';

const STATUSES: FoundItemStatus[] = ['등록', '보관중', '수령대기', '수령완료', '폐기예정'];

export function AdminItemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') ?? '';

  const { data, isLoading } = useQuery({ queryKey: ['admin-items'], queryFn: adminListItems });
  const [filters, setFilters] = useState({ status: initialStatus, keyword: '' });

  function updateStatus(status: string) {
    setFilters((f) => ({ ...f, status }));
    if (status) setSearchParams({ status });
    else setSearchParams({});
  }

  const list = useMemo(() => {
    if (!data) return [];
    return data.filter((i) =>
      (!filters.status || i.status === filters.status) &&
      (!filters.keyword ||
        i.itemName.includes(filters.keyword) ||
        i.foundPlace.includes(filters.keyword))
    );
  }, [data, filters]);

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">
        전체 습득물
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
            label="검색 (물품명 / 장소)"
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          />
        </div>
      </Card>
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">물품명</th>
              <th className="text-left px-4 py-2 font-medium">카테고리</th>
              <th className="text-left px-4 py-2 font-medium">습득 장소</th>
              <th className="text-left px-4 py-2 font-medium">습득 일시</th>
              <th className="text-left px-4 py-2 font-medium">보관 위치</th>
              <th className="text-left px-4 py-2 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.itemId} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium">{i.itemName}</td>
                <td className="px-4 py-2">{i.category}</td>
                <td className="px-4 py-2">{i.foundPlace}</td>
                <td className="px-4 py-2">{fmtDateTime(i.foundDate)}</td>
                <td className="px-4 py-2">{i.storageLocation ?? '-'}</td>
                <td className="px-4 py-2"><StatusBadge status={i.status} /></td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                  해당하는 습득물이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
