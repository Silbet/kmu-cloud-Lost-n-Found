import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useAuthBootstrap } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { SearchPage } from '@/pages/search/SearchPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';

import { NewReportPage } from '@/pages/reports/NewReportPage';
import { MyReportsPage } from '@/pages/reports/MyReportsPage';
import { ReportDetailPage } from '@/pages/reports/ReportDetailPage';
import { PickupPage } from '@/pages/pickups/PickupPage';

import { NewItemPage } from '@/pages/items/NewItemPage';
import { MyItemsPage } from '@/pages/items/MyItemsPage';

import { ManagerDashboard } from '@/pages/manager/ManagerDashboard';
import { ManagerItemsPage } from '@/pages/manager/ManagerItemsPage';
import { ConfirmationsPage } from '@/pages/manager/ConfirmationsPage';
import { ManagerPickupsPage } from '@/pages/manager/ManagerPickupsPage';
import { FinalizePage } from '@/pages/manager/FinalizePage';
import { ManagerSettingsPage } from '@/pages/manager/ManagerSettingsPage';

import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage';
import { AdminItemsPage } from '@/pages/admin/AdminItemsPage';
import { AdminUnclaimedPage } from '@/pages/admin/AdminUnclaimedPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';
import { ManagerApprovalsPage } from '@/pages/admin/ManagerApprovalsPage';

import { MyPage } from '@/pages/mypage/MyPage';

/** 역할에 따라 적절한 홈 화면으로 리다이렉트 */
function RoleBasedHome() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <LandingPage />;
  if (user.roles.includes('운영관리자')) return <Navigate to="/admin" replace />;
  if (user.roles.includes('보관소관리자') && !user.pendingApproval) return <Navigate to="/manager" replace />;
  return <LandingPage />;
}

export default function App() {
  useAuthBootstrap();
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<RoleBasedHome />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="search" element={<SearchPage />} />

        <Route path="notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />

        {/* 일반사용자 라우트 */}
        <Route path="reports/new" element={<ProtectedRoute roles={['일반사용자']}><NewReportPage /></ProtectedRoute>} />
        <Route path="reports/my"  element={<ProtectedRoute roles={['일반사용자']}><MyReportsPage /></ProtectedRoute>} />
        <Route path="reports/:reportId" element={<ProtectedRoute roles={['일반사용자']}><ReportDetailPage /></ProtectedRoute>} />
        <Route path="pickups/:pickupId" element={<ProtectedRoute><PickupPage /></ProtectedRoute>} />

        <Route path="items/new" element={<ProtectedRoute roles={['일반사용자']}><NewItemPage /></ProtectedRoute>} />
        <Route path="items/my"  element={<ProtectedRoute roles={['일반사용자']}><MyItemsPage /></ProtectedRoute>} />

        {/* 보관소관리자 라우트 */}
        <Route path="manager"               element={<ProtectedRoute roles={['보관소관리자']}><ManagerDashboard /></ProtectedRoute>} />
        <Route path="manager/items"         element={<ProtectedRoute roles={['보관소관리자']}><ManagerItemsPage /></ProtectedRoute>} />
        <Route path="manager/confirmations" element={<ProtectedRoute roles={['보관소관리자']}><ConfirmationsPage /></ProtectedRoute>} />
        <Route path="manager/pickups"       element={<ProtectedRoute roles={['보관소관리자']}><ManagerPickupsPage /></ProtectedRoute>} />
        <Route path="manager/finalize"      element={<ProtectedRoute roles={['보관소관리자']}><FinalizePage /></ProtectedRoute>} />
        <Route path="manager/settings"      element={<ProtectedRoute roles={['보관소관리자']}><ManagerSettingsPage /></ProtectedRoute>} />

        {/* 운영관리자 라우트 */}
        <Route path="admin"                    element={<ProtectedRoute roles={['운영관리자']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="admin/reports"            element={<ProtectedRoute roles={['운영관리자']}><AdminReportsPage /></ProtectedRoute>} />
        <Route path="admin/items"              element={<ProtectedRoute roles={['운영관리자']}><AdminItemsPage /></ProtectedRoute>} />
        <Route path="admin/unclaimed"          element={<ProtectedRoute roles={['운영관리자']}><AdminUnclaimedPage /></ProtectedRoute>} />
        <Route path="admin/settings"           element={<ProtectedRoute roles={['운영관리자']}><AdminSettingsPage /></ProtectedRoute>} />
        <Route path="admin/manager-approvals"  element={<ProtectedRoute roles={['운영관리자']}><ManagerApprovalsPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
