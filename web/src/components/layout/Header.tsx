import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { unreadCount } from '@/api/notifications';
import { logout } from '@/api/auth';
import { mockStorage } from '@/api/mock/storage';
import { USE_MOCK } from '@/api/client';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  const { data: unread } = useQuery({
    queryKey: ['unread-count'],
    queryFn: unreadCount,
    enabled: !!user,
    refetchInterval: 30000,
  });

  async function handleLogout() {
    try { await logout(); } catch { /* ignore */ }
    clear();
    navigate('/');
  }

  function handleResetMock() {
    if (confirm('Mock 데이터를 시드값으로 초기화합니다. 계속하시겠습니까?')) {
      mockStorage.reset();
      localStorage.removeItem('lf_auth_token');
      window.location.href = '/';
    }
  }

  const isUser = user?.roles.includes('일반사용자');
  const isManager = user?.roles.includes('보관소관리자') && !user?.pendingApproval;
  const isAdmin = user?.roles.includes('운영관리자');

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-semibold text-gray-900">국민대 분실물보관소</Link>
          <nav className="hidden md:flex items-center gap-4 text-sm text-gray-700">
            <Link to="/search" className="hover:text-blue-600">검색</Link>
            {isUser && (
              <>
                <Link to="/reports/my" className="hover:text-blue-600">내 신고</Link>
                <Link to="/items/my" className="hover:text-blue-600">내 등록</Link>
              </>
            )}
            {isManager && (
              <Link to="/manager" className="hover:text-blue-600">보관소 관리</Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="hover:text-blue-600">운영 관리</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {USE_MOCK && (
            <button
              onClick={handleResetMock}
              className="text-xs text-gray-500 hover:text-red-600 border border-dashed border-gray-300 rounded px-2 py-1"
            >
              Mock 초기화
            </button>
          )}
          {user ? (
            <>
              <Link to="/notifications" className="relative" aria-label="알림">
                <span className="text-xl">🔔</span>
                {unread && unread.count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {unread.count > 9 ? '9+' : unread.count}
                  </span>
                )}
              </Link>
              <Link to="/mypage" className="text-sm text-gray-700 hover:text-blue-600">
                {user.name}
              </Link>
              <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600">
                로그아웃
              </button>
            </>
          ) : (
            <Link to="/login" className="text-sm text-blue-600 hover:underline">로그인</Link>
          )}
        </div>
      </div>
    </header>
  );
}
