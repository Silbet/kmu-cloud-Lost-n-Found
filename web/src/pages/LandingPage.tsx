import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/store/authStore';

export function LandingPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <h1 className="text-3xl font-semibold text-gray-900">국민대학교 분실물 보관소</h1>
      <p className="mt-3 text-gray-600">잃어버린 물건을 찾고, 주운 물건을 등록하세요.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/search"><Button variant="primary">분실물 / 습득물 검색</Button></Link>
        {user ? (
          <>
            {user.roles.includes('일반사용자') && <Link to="/reports/new"><Button variant="secondary">분실 신고</Button></Link>}
            {user.roles.includes('일반사용자') && <Link to="/items/new"><Button variant="secondary">습득물 등록</Button></Link>}
          </>
        ) : (
          <Link to="/login"><Button variant="secondary">로그인</Button></Link>
        )}
      </div>
    </div>
  );
}
