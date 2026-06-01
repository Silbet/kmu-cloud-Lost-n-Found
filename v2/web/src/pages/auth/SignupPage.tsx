import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '@/api/auth';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { PhoneInput } from '@/components/common/PhoneInput';
import { Card } from '@/components/common/Card';
import { toast } from '@/store/toastStore';

type SignupRole = '일반사용자' | '보관소관리자';

const ROLE_DESCRIPTIONS: Record<SignupRole, string> = {
  '일반사용자': '분실물 신고 및 습득물 등록이 가능합니다.',
  '보관소관리자': '분실물 보관소를 관리합니다. 운영 관리자의 승인이 필요합니다.',
};

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', name: '', contact: '' });
  const [role, setRole] = useState<SignupRole>('일반사용자');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signup({ ...form, role });
      if (role === '보관소관리자') {
        toast('가입 신청이 완료되었습니다. 운영 관리자 승인 후 이용 가능합니다.', 'success');
      } else {
        toast('가입되었습니다. 로그인 해주세요.', 'success');
      }
      navigate('/login');
    } catch (err: any) {
      setError(err?.message || '가입 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <Card>
        <h1 className="text-xl font-semibold text-gray-900 mb-4">회원가입</h1>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
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
          <PhoneInput
            label="연락처"
            value={form.contact}
            onChange={(val) => setForm({ ...form, contact: val })}
            required
          />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">가입 유형</p>
            <div className="flex flex-col gap-2">
              {(['일반사용자', '보관소관리자'] as SignupRole[]).map((r) => (
                <label
                  key={r}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    role === r
                      ? 'bg-blue-50 border-blue-400'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className={`text-sm font-medium ${role === r ? 'text-blue-700' : 'text-gray-800'}`}>{r}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{ROLE_DESCRIPTIONS[r]}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? '가입 중...' : '가입하기'}</Button>
        </form>
        <p className="text-sm text-gray-500 mt-4">
          이미 계정이 있나요? <Link to="/login" className="text-blue-600 hover:underline">로그인</Link>
        </p>
      </Card>
    </div>
  );
}
