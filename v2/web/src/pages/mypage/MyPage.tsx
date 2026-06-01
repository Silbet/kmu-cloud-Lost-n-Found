import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { changePassword } from '@/api/auth';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { toast } from '@/store/toastStore';

export function MyPage() {
  const user = useAuthStore((s) => s.user);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 6) {
      setError('새 비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await changePassword(oldPassword, newPassword);
      toast('비밀번호가 변경되었습니다.', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.message || '비밀번호 변경 실패');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-4">마이페이지</h1>

      <Card className="mb-4">
        <h2 className="font-medium text-gray-800 mb-3">내 정보</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-24 text-gray-500">이름</dt>
            <dd className="text-gray-900">{user.name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 text-gray-500">학교 이메일</dt>
            <dd className="text-gray-900">{user.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 text-gray-500">연락처</dt>
            <dd className="text-gray-900">{user.contact}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 text-gray-500">역할</dt>
            <dd className="text-gray-900">{user.roles.join(', ')}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="font-medium text-gray-800 mb-3">비밀번호 변경</h2>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <Input
            label="현재 비밀번호"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />
          <Input
            label="새 비밀번호"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            label="새 비밀번호 확인"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
