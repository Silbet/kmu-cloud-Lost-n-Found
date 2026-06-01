import { UserRole } from '@prisma/client';

export type PublicRole = '일반사용자' | '보관소관리자' | '운영관리자';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
