import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { adminStats, createAdminAccount } from '@/api/admin';
import { Card } from '@/components/common/Card';
import { Spinner } from '@/components/common/Spinner';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { toast } from '@/store/toastStore';

const REPORT_STATUSES = [
  { label: '접수', to: '/admin/reports?status=접수' },
  { label: '매칭후보있음', to: '/admin/reports?status=매칭후보있음' },
  { label: '찾기완료', to: '/admin/reports?status=찾기완료' },
  { label: '종료', to: '/admin/reports?status=종료' },
];
const ITEM_STATUSES = [
  { label: '등록', to: '/admin/items?status=등록' },
  { label: '보관중', to: '/admin/items?status=보관중' },
  { label: '수령대기', to: '/admin/items?status=수령대기' },
  { label: '수령완료', to: '/admin/items?status=수령완료' },
  { label: '폐기예정', to: '/admin/items?status=폐기예정' },
];

export function AdminDashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: adminStats });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', contact: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const createAdminMut = useMutation({
    mutationFn: createAdminAccount,
    onSuccess: () => {
      toast('운영자 계정이 생성되었습니다.', 'success');
      setShowCreateModal(false);
      setForm({ email: '', password: '', name: '', contact: '' });
      setFormError(null);
      qc.invalidateQueries();
    },
    onError: (e: any) => setFormError(e?.message || '계정 생성 실패'),
  });

  function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    createAdminMut.mutate(form);
  }

  if (isLoading || !data) return <Spinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">운영 관리자 대시보드</h1>
        <div className="flex gap-2">
          <Link to="/admin/manager-approvals">
            <Button size="sm" variant="secondary">보관소 관리자 승인</Button>
          </Link>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>운영자 계정 생성</Button>
        </div>
      </div>

      <h2 className="text-sm font-medium text-gray-600 mb-2">분실 신고 상태</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {REPORT_STATUSES.map(({ label, to }) => (
          <Link key={label} to={to}>
            <Card className="hover:border-blue-300 transition cursor-pointer">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-semibold mt-1">{data.lostReportsByStatus[label] ?? 0}</p>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="text-sm font-medium text-gray-600 mb-2">습득물 상태</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {ITEM_STATUSES.map(({ label, to }) => (
          <Link key={label} to={to}>
            <Card className="hover:border-blue-300 transition cursor-pointer">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-semibold mt-1">{data.foundItemsByStatus[label] ?? 0}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <h2 className="font-medium mb-3">최근 30일 추이</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.recentTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="reports" fill="#2563eb" name="신고" />
              <Bar dataKey="items" fill="#94a3b8" name="습득" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Modal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setFormError(null); }}
        title="운영자 계정 생성"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreateModal(false); setFormError(null); }}>취소</Button>
            <Button form="create-admin-form" type="submit" disabled={createAdminMut.isPending}>
              {createAdminMut.isPending ? '생성 중...' : '생성'}
            </Button>
          </>
        }
      >
        <form id="create-admin-form" onSubmit={handleCreateAdmin} className="flex flex-col gap-3">
          <Input
            label="학교 이메일"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="비밀번호"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <Input
            label="이름"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="연락처"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            placeholder="010-0000-0000"
            required
          />
          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </form>
      </Modal>
    </div>
  );
}
