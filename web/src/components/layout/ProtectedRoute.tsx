import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: UserRole[];
}) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!user) {
    return null; // wait for /me to load
  }
  // 보관소관리자 승인 대기 중인 경우
  if (user.pendingApproval && user.roles.includes('보관소관리자')) {
    return <PendingApproval />;
  }
  if (roles && !roles.some((r) => user.roles.includes(r))) {
    return <Forbidden />;
  }
  return <>{children}</>;
}

export function Forbidden() {
  return (
    <div className="max-w-md mx-auto mt-24 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">403</h1>
      <p className="mt-2 text-gray-600">이 페이지에 접근할 권한이 없습니다.</p>
    </div>
  );
}

export function PendingApproval() {
  return (
    <div className="max-w-md mx-auto mt-24 text-center">
      <div className="text-5xl mb-4">⏳</div>
      <h1 className="text-2xl font-semibold text-gray-900">승인 대기 중</h1>
      <p className="mt-3 text-gray-600">
        보관소 관리자 계정 신청이 접수되었습니다.
        <br />
        운영 관리자의 승인 후 서비스를 이용하실 수 있습니다.
      </p>
      <p className="mt-2 text-sm text-gray-400">
        승인 완료 시 알림을 보내드립니다.
      </p>
    </div>
  );
}
