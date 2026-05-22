// 역할: 일반사용자(분실+습득 통합), 보관소관리자(승인 필요), 운영관리자(admin 생성)
export type UserRole = '일반사용자' | '보관소관리자' | '운영관리자';

export interface User {
  userId: string;
  email: string;
  name: string;
  contact: string;
  roles: UserRole[];
  pendingApproval?: boolean; // 보관소관리자 가입 승인 대기
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  contact: string;
  role: '일반사용자' | '보관소관리자'; // 회원가입 시 선택 가능한 2종
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
