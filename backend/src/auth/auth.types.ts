import { UserRole, type User } from '@prisma/client';

export type PublicRole = '일반사용자' | '보관소관리자' | '운영관리자';

export interface PublicUser {
  userId: string;
  email: string;
  name: string;
  contact: string;
  roles: PublicRole[];
  pendingApproval?: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export function toPublicRole(role: UserRole): PublicRole {
  switch (role) {
    case UserRole.MANAGER:
      return '보관소관리자';
    case UserRole.ADMIN:
      return '운영관리자';
    case UserRole.USER:
    default:
      return '일반사용자';
  }
}

export function toPublicUser(user: User): PublicUser {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    contact: user.contact,
    roles: [toPublicRole(user.role)],
    pendingApproval: user.pendingApproval,
  };
}
