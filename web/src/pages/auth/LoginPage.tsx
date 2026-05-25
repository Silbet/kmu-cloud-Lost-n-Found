import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login, me } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Card } from '@/components/common/Card';
import { toast } from '@/store/toastStore';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login({ email, password });
      setAuth(res.user, res.token);
      const u = await me();
      setAuth(u, res.token);
      const dest = (location.state as { from?: string } | null)?.from;
      if (dest) {
        navigate(dest);
      } else if (u.roles.includes('운영관리자')) {
        navigate('/admin');
      } else if (u.roles.includes('보관소관리자') && !u.pendingApproval) {
        navigate('/manager');
      } else {
        navigate('/reports/my');
      }
      toast('로그인되었습니다.', 'success');
    } catch (err: any) {
      setError(err?.message || '로그인 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <Card>
        <h1 className="text-xl font-semibold text-gray-900 mb-4">로그인</h1>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <Input label="학교 이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? '로그인 중...' : '로그인'}</Button>
        </form>
        <p className="text-sm text-gray-500 mt-4">
          계정이 없으신가요? <Link to="/signup" className="text-blue-600 hover:underline">회원가입</Link>
        </p>
        <div className="mt-4 text-xs text-gray-500 border-t pt-3">
          <p className="font-medium">데모 계정 (비밀번호 모두 password)</p>
          <ul className="mt-1 space-y-0.5">
            <li>일반사용자: user1@kookmin.ac.kr</li>
            <li>보관소 관리자: manager@kookmin.ac.kr</li>
            <li>승인 대기 관리자: manager.pending@kookmin.ac.kr</li>
            <li>운영 관리자: admin@kookmin.ac.kr</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
